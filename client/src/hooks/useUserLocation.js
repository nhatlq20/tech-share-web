import { useCallback, useEffect, useRef, useState } from 'react';
import { STRINGS } from '../constants/strings';

export const LOCATION_CACHE_KEY = 'techshare:last-user-location';
export const LOCATION_FRESH_MS = 30 * 60 * 1000;
export const LOCATION_MOVEMENT_METERS = 150;
export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false, timeout: 8000, maximumAge: 60000,
};
const debug = (label, value) => {
  if (process.env.NODE_ENV === 'development') console.info(`[WEB LOCATION] ${label}:`, value);
};
const validLocation = (value) => value && Number.isFinite(value.latitude) &&
  Math.abs(value.latitude) <= 90 && Number.isFinite(value.longitude) &&
  Math.abs(value.longitude) <= 180 && Number.isFinite(value.timestamp) && value.timestamp >= 0 &&
  (value.accuracy === undefined || (Number.isFinite(value.accuracy) && value.accuracy >= 0));

export const getSavedLocation = () => {
  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (validLocation(value)) return {
      latitude: value.latitude, longitude: value.longitude, timestamp: value.timestamp,
      ...(value.accuracy === undefined ? {} : { accuracy: value.accuracy }),
    };
    window.localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch {
    try { window.localStorage.removeItem(LOCATION_CACHE_KEY); } catch { /* Storage unavailable. */ }
  }
  return null;
};
// Keep browser positioning usable even when storage is blocked.
const saveLocation = (location) => {
  try { window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location)); } catch { /* Keep location in memory. */ }
};

export { getSavedLocation as readLastLocation };

const distanceMeters = (a, b) => {
  const rad = (degrees) => degrees * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) *
    Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
};
const getInitialLocationState = () => {
  const cache = getSavedLocation();
  return {
    latitude: null, longitude: null, ...cache,
    source: cache ? 'CACHE' : 'NONE',
    isStale: !!cache && Date.now() - cache.timestamp > LOCATION_FRESH_MS,
    loading: !cache, refreshing: false, error: null, warning: null,
    errorCode: null, errorMessage: null, permissionState: null, revision: 0,
  };
};

export const useUserLocation = () => {
  const [state, setState] = useState(getInitialLocationState);
  const current = useRef(state);
  current.current = state;
  const [attempt, setAttempt] = useState(0);
  const refreshLocation = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let active = true;
    let settled = false;
    let timer;
    let permissionTimer;
    let permissionStatus;
    let positionPending = false;
    const handlePermissionChange = () => {
      if (!active) return;
      const permission = permissionStatus.state;
      setState(previous => ({ ...previous, permissionState: permission }));
      if (permission === 'granted' && !positionPending) refreshLocation();
    };
    const hasLocation = () => current.current.latitude != null && current.current.longitude != null;
    const handleLocationError = (message, code, browserMessage, acceptLatePosition = false) => {
      if (!active || settled) return;
      settled = !acceptLatePosition;
      positionPending = false;
      clearTimeout(timer);
      debug('background refresh', hasLocation() ? 'failed; preserving location' : 'unavailable');
      setState(previous => ({ ...previous, loading: false, refreshing: false,
        error: hasLocation() ? null : message, warning: hasLocation() ? message : null,
        errorCode: code, errorMessage: browserMessage,
        permissionState: code === 1 ? 'denied' : previous.permissionState,
      }));
    };
    const getCurrentLocation = () => {
      if (!active) return;
      if (!navigator.geolocation) {
        handleLocationError(STRINGS.home.nearby.unsupported, null, 'Geolocation API unavailable'); return;
      }
      if (window.isSecureContext === false) {
        handleLocationError(STRINGS.home.nearby.insecureContext, null, 'Secure context required'); return;
      }
      debug('background refresh', hasLocation());
      positionPending = true;
      let triedHighAccuracy = false;
      setState(previous => ({ ...previous, loading: !hasLocation(), refreshing: hasLocation(),
        error: null, warning: null }));
      timer = setTimeout(() => handleLocationError(STRINGS.home.nearby.locationTimeout, null,
        'Application deadline exceeded after 20000 ms', true), 20000);
      try {
        const handlePositionSuccess = ({ coords, timestamp }) => {
          if (!active || settled) return;
          const next = { latitude: coords.latitude, longitude: coords.longitude,
            timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
            ...(Number.isFinite(coords.accuracy) ? { accuracy: coords.accuracy } : {}),
          };
          if (!validLocation(next)) {
            handleLocationError(STRINGS.home.nearby.locationError, null, 'Invalid browser coordinates'); return;
          }
          settled = true;
          positionPending = false;
          clearTimeout(timer);
          saveLocation(next);
          const previous = current.current;
          const movement = hasLocation() ? distanceMeters(previous, next) : Infinity;
          const refetch = attempt > 0 || movement >= LOCATION_MOVEMENT_METERS;
          debug('source', 'BROWSER');
          debug('movement meters', movement);
          debug('recommendation refetch', refetch);
          setState(value => ({ ...value, ...next,
            // Keep the recommendation anchor stable for small GPS jitter.
            latitude: refetch ? next.latitude : value.latitude,
            longitude: refetch ? next.longitude : value.longitude,
            source: 'BROWSER', isStale: Date.now() - next.timestamp > LOCATION_FRESH_MS,
            loading: false, refreshing: false, error: null, warning: null,
            errorCode: null, errorMessage: null, permissionState: 'granted',
            revision: value.revision + (refetch ? 1 : 0),
          }));
        };
        const handlePositionError = error => {
          if (!active || settled) return;
          // Try a more accurate fresh fix only if the fast browser request fails.
          if (!triedHighAccuracy && (error.code === 2 || error.code === 3)) {
            triedHighAccuracy = true;
            debug('background refresh', 'retrying browser high accuracy positioning');
            try {
              navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
                enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
              });
            } catch (exception) { handleLocationError(STRINGS.home.nearby.locationError, null, exception.message); }
            return;
          }
          handleLocationError(error.code === 1 ? STRINGS.home.nearby.permissionRequired :
          error.code === 2 ? STRINGS.home.nearby.locationUnavailable :
          error.code === 3 ? STRINGS.home.nearby.locationTimeout : STRINGS.home.nearby.locationError,
          error.code, error.message);
        };
        navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, GEOLOCATION_OPTIONS);
      } catch (error) { handleLocationError(STRINGS.home.nearby.locationError, null, error.message); }
    };
    const initializeLocation = async () => {
      debug('source', current.current.source);
      debug('cache age', current.current.timestamp == null ? null : Date.now() - current.current.timestamp);
      debug('stale', current.current.isStale);
      // Explicit user action may prompt, even when the Permissions API is unavailable.
      if (attempt > 0) { getCurrentLocation(); return; }
      let permission = 'unknown';
      try {
        if (navigator.permissions?.query) {
          const result = await Promise.race([
            navigator.permissions.query({ name: 'geolocation' }),
            new Promise(resolve => {
              permissionTimer = setTimeout(() => resolve({ state: 'unknown' }), 1500);
            }),
          ]);
          permission = result.state;
          permissionStatus = result;
          permissionStatus.addEventListener?.('change', handlePermissionChange);
        }
      } catch { /* With cache, unknown permission must never trigger a prompt. */ }
      finally { clearTimeout(permissionTimer); }
      if (!active) return;
      debug('permission state', permission);
      setState(previous => ({ ...previous, permissionState: permission }));
      if (hasLocation()) {
        if (permission === 'granted') getCurrentLocation();
      } else if (permission === 'denied') {
        handleLocationError(STRINGS.home.nearby.permissionRequired, 1, 'Location permission denied');
      } else getCurrentLocation();
    };
    // React StrictMode cleans up its probe effect before this microtask starts.
    Promise.resolve().then(() => { if (active) initializeLocation(); });
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(permissionTimer);
      permissionStatus?.removeEventListener?.('change', handlePermissionChange);
    };
  }, [attempt, refreshLocation]);

  return { ...state, refreshLocation, retry: refreshLocation };
};

import { useCallback, useEffect, useState } from 'react';
import { STRINGS } from '../constants/strings';

export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
};

const debug = (label, value) => {
  if (process.env.NODE_ENV === 'development') console.info(`[WEB LOCATION] ${label}:`, value);
};
const initialState = () => ({
  latitude: null, longitude: null, loading: true, error: null,
  errorCode: null, errorMessage: null, permissionState: null,
});

export const useUserLocation = () => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(initialState);
  const retry = useCallback(() => {
    debug('retry requested', true);
    setState(initialState());
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let timer;
    const supported = 'geolocation' in navigator && !!navigator.geolocation;
    debug('browser', navigator.userAgent);
    debug('supported', supported);
    debug('secure context', window.isSecureContext);
    const fail = (message, code, browserMessage) => {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      debug('error code', code);
      debug('error message', browserMessage);
      setState((previous) => ({ ...previous, latitude: null, longitude: null,
        loading: false, error: message, errorCode: code, errorMessage: browserMessage,
        permissionState: code === 1 ? 'denied' : previous.permissionState,
      }));
    };
    if (!supported) {
      fail(STRINGS.home.nearby.unsupported, null, 'Geolocation API is unavailable in this browser.');
      return;
    }
    if (window.isSecureContext === false) {
      fail(STRINGS.home.nearby.insecureContext, null, 'Geolocation requires a secure context.');
      return;
    }
    // Permission inspection is diagnostic only; never let it delay the location request.
    if (navigator.permissions?.query) {
      try {
        navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
          if (!active) return;
          debug('permission state', permission.state);
          setState((previous) => ({ ...previous, permissionState: permission.state }));
        }).catch((error) => { if (active) debug('permission query unavailable', error.message); });
      } catch (error) { debug('permission query unavailable', error.message); }
    } else debug('permission state', 'Permissions API unavailable');

    // Some environments never invoke either callback, including while a prompt is left unanswered.
    timer = setTimeout(() => fail(STRINGS.home.nearby.locationTimeout, null,
      'Application deadline exceeded after 20000 ms; browser did not return a location.'), 20000);
    debug('requesting', GEOLOCATION_OPTIONS);
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!active) return;
          active = false;
          clearTimeout(timer);
          debug('success', true);
          debug('latitude', coords.latitude);
          debug('longitude', coords.longitude);
          setState((previous) => ({ ...previous, latitude: coords.latitude, longitude: coords.longitude,
            loading: false, error: null, errorCode: null, errorMessage: null, permissionState: 'granted' }));
        },
        (error) => fail(error.code === 1 ? STRINGS.home.nearby.permissionRequired :
          error.code === 2 ? STRINGS.home.nearby.locationUnavailable :
          error.code === 3 ? STRINGS.home.nearby.locationTimeout : STRINGS.home.nearby.locationError,
          error.code, error.message),
        GEOLOCATION_OPTIONS
      );
    } catch (error) { fail(STRINGS.home.nearby.locationError, null, error.message); }
    return () => { active = false; clearTimeout(timer); };
  }, [attempt]);

  return { ...state, retry };
};

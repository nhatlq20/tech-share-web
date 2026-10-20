import React, { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../utils/formatters';

const FAVI_MAP_API_KEY = process.env.REACT_APP_FAVI_MAP_API_KEY || process.env.VITE_FAVI_MAP_API_KEY || '';

/**
 * Validates and extracts coordinates in [longitude, latitude] format for Favi Map.
 * MongoDB stores GeoJSON as [longitude, latitude].
 */
export const getDevicePosition = (device) => {
  const coordinates = device?.location?.coordinates;
  if (device?.location?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  // MongoDB stores [longitude, latitude]; Favi Map expects [longitude, latitude].
  return [longitude, latitude];
};

/**
 * Sanitizes text to prevent XSS injection inside MapLibre / Favi Map HTML popups.
 */
export const escapeHtml = (text) => {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Dynamically loads the official Favi Map SDK if not already available on window.
 */
export const loadFaviMapSdk = (apiKey) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.FaviMap) return Promise.resolve(window.FaviMap);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="favimap.js"]');
    if (existingScript) {
      if (window.FaviMap) {
        resolve(window.FaviMap);
        return;
      }
      existingScript.addEventListener('load', () => {
        if (window.FaviMap) resolve(window.FaviMap);
        else reject(new Error('FaviMap object not found after script load'));
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Favi Map script'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-map.fastviet.vn/sdk/favimap.js?key=${encodeURIComponent(apiKey || '')}`;
    script.async = true;
    script.onload = () => {
      if (window.FaviMap) {
        resolve(window.FaviMap);
      } else {
        reject(new Error('FaviMap object not found on window'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Favi Map SDK'));
    };
    document.head.appendChild(script);
  });
};

export const MapView = ({ latitude, longitude, devices = [], selectedDeviceId, onMarkerClick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const isMountedRef = useRef(true);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Initialize Favi Map once on mount
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setMapError(null);

    loadFaviMapSdk(FAVI_MAP_API_KEY)
      .then((FaviMap) => {
        if (!isMountedRef.current || !containerRef.current) return;

        FaviMap.ready(() => {
          if (!isMountedRef.current || !containerRef.current) return;

          try {
            const initialCenter = Number.isFinite(longitude) && Number.isFinite(latitude)
              ? [longitude, latitude]
              : [105.85, 21.03];

            const instanceOrPromise = FaviMap.create(containerRef.current, {
              center: initialCenter,
              zoom: 13,
              key: FAVI_MAP_API_KEY,
            });

            Promise.resolve(instanceOrPromise)
              .then((mapInstance) => {
                if (!isMountedRef.current || !mapInstance) return;
                mapRef.current = mapInstance;

                if (typeof mapInstance.on === 'function') {
                  mapInstance.on('error', () => {
                    if (isMountedRef.current) {
                      setMapError('Map tiles could not load. Check your internet connection. Device details remain available.');
                    }
                  });
                }

                setIsMapReady(true);
                setIsLoading(false);
              })
              .catch((err) => {
                if (isMountedRef.current) {
                  setIsLoading(false);
                  setMapError('Map could not be initialized.');
                }
              });
          } catch (createErr) {
            if (isMountedRef.current) {
              setIsLoading(false);
              setMapError('Map could not be initialized.');
            }
          }
        });
      })
      .catch(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
          setMapError('Map tiles could not load. Check your internet connection. Device details remain available.');
        }
      });

    return () => {
      isMountedRef.current = false;
      if (mapRef.current) {
        try {
          if (typeof mapRef.current.remove === 'function') {
            mapRef.current.remove();
          }
        } catch (e) {
          // Ignore cleanup errors during unmount
        }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter map when user GPS coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (typeof map.flyToLocation === 'function') {
      map.flyToLocation([longitude, latitude], 13);
    } else if (typeof map.flyTo === 'function') {
      map.flyTo({ center: [longitude, latitude], zoom: 13 });
    }
  }, [latitude, longitude]);

  // Update markers when device list, selected device, or user location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    if (typeof map.clearMarkers === 'function') {
      map.clearMarkers();
    }

    // Add user marker with distinct blue pulse style
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && typeof map.addMarker === 'function') {
      map.addMarker([longitude, latitude], {
        html: '<div class="nearby-user-marker" title="Your location" aria-label="Your location"><span></span></div>',
      });
    }

    // Add device markers
    if (Array.isArray(devices) && typeof map.addMarker === 'function') {
      devices.forEach((device) => {
        const position = getDevicePosition(device);
        if (!position) return;

        const id = String(device._id || device.id);
        const isSelected = id === selectedDeviceId;
        const title = device.title || device.name || 'Device';
        const priceText = formatPrice(device.dailyRate ?? device.pricePerDay ?? 0);
        const distText = Number.isFinite(device.distanceMeters)
          ? `${(device.distanceMeters / 1000).toFixed(1)} km`
          : '';
        const imageUrl = Array.isArray(device.images) && device.images[0] ? device.images[0] : null;

        const escapedTitle = escapeHtml(title);
        const escapedPrice = escapeHtml(priceText);
        const escapedDist = escapeHtml(distText);
        const detailUrl = `/device/${encodeURIComponent(id)}`;

        const popupHtml = `
          <div class="nearby-popup-content" style="min-width:160px;max-width:220px;font-family:inherit;font-size:13px;line-height:1.4;">
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapedTitle}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;display:block;" />` : ''}
            <strong style="display:block;font-size:14px;color:#193047;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapedTitle}</strong>
            <div style="color:#168b95;font-weight:600;margin-bottom:2px;">${escapedPrice} / day</div>
            ${escapedDist ? `<div style="color:#718096;font-size:12px;margin-bottom:8px;">${escapedDist} away</div>` : ''}
            <a href="${detailUrl}" style="display:inline-block;padding:5px 12px;background:#168b95;color:#ffffff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">View Details</a>
          </div>
        `.trim();

        const marker = map.addMarker(position, {
          title,
          html: `<div class="nearby-device-marker${isSelected ? ' is-selected' : ''}" title="${escapedTitle}" aria-label="${escapedTitle}"><span></span></div>`,
          popup: popupHtml,
          openPopup: isSelected,
        });

        if (marker) {
          const el = typeof marker.getElement === 'function' ? marker.getElement() : null;
          if (el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
              if (typeof marker.togglePopup === 'function' && !marker.getPopup()?.isOpen()) {
                marker.togglePopup();
              }
              if (typeof onMarkerClick === 'function') {
                onMarkerClick(id);
              }
            });
          }
          if (typeof marker.on === 'function') {
            marker.on('click', () => {
              if (typeof onMarkerClick === 'function') {
                onMarkerClick(id);
              }
            });
          }

          if (isSelected && typeof marker.getPopup === 'function') {
            const popup = marker.getPopup();
            if (popup && typeof popup.addTo === 'function' && !popup.isOpen?.()) {
              try {
                popup.addTo(map);
              } catch (e) {
                // ignore
              }
            }
          }
        }
      });
    }
  }, [devices, selectedDeviceId, latitude, longitude, onMarkerClick, isMapReady]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (typeof map.flyToLocation === 'function') {
      map.flyToLocation([longitude, latitude], 13);
    } else if (typeof map.flyTo === 'function') {
      map.flyTo({ center: [longitude, latitude], zoom: 13 });
    }
  };

  return (
    <div className="nearby-map-wrap">
      <div ref={containerRef} className="nearby-map" aria-label="Nearby device map" />
      {isLoading && (
        <div
          className="nearby-map-loading"
          role="status"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(238, 243, 244, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            color: '#168b95',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Loading Favi Map...
        </div>
      )}
      <button type="button" className="nearby-recenter" onClick={handleRecenter}>
        Recenter on me
      </button>
      {mapError && (
        <p className="nearby-tile-warning" role="status">
          {mapError}
        </p>
      )}
    </div>
  );
};

export default MapView;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPrice } from '../../utils/formatters';

const FAVI_MAP_API_KEY = process.env.REACT_APP_FAVI_MAP_API_KEY || process.env.VITE_FAVI_MAP_API_KEY || '';

export const GOOGLE_MAPS_TILE_CONFIG = {
  url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  subdomains: ['0', '1', '2', '3'],
  maxZoom: 20,
  attribution: '&copy; Google Maps',
};

/**
 * Validates and extracts coordinates in [longitude, latitude] format.
 * MongoDB stores GeoJSON as [longitude, latitude].
 */
export const getDevicePosition = (device) => {
  const coordinates = device?.location?.coordinates;
  if (device?.location?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return [longitude, latitude];
};

/**
 * Sanitizes text to prevent XSS injection inside HTML popups.
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
 * Maintained for backwards compatibility / test mocks.
 */
export const loadFaviMapSdk = (apiKey) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.FaviMap) return Promise.resolve(window.FaviMap);
  return Promise.reject(new Error('Favi Map unavailable, using Google Maps'));
};

export const MapView = ({ latitude, longitude, devices = [], selectedDeviceId, onMarkerClick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const isMountedRef = useRef(true);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Initialize Map on mount
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setMapError(null);

    // 1. If window.FaviMap is explicitly injected (e.g. in test environment), use it to preserve tests
    if (typeof window !== 'undefined' && window.FaviMap) {
      window.FaviMap.ready(() => {
        if (!isMountedRef.current || !containerRef.current) return;
        try {
          const initialCenter = Number.isFinite(longitude) && Number.isFinite(latitude)
            ? [longitude, latitude]
            : [105.85, 21.03];

          const instanceOrPromise = window.FaviMap.create(containerRef.current, {
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
            .catch(() => {
              if (isMountedRef.current) {
                setIsLoading(false);
                setMapError('Map could not be initialized.');
              }
            });
        } catch {
          if (isMountedRef.current) {
            setIsLoading(false);
            setMapError('Map could not be initialized.');
          }
        }
      });

      return () => {
        isMountedRef.current = false;
        if (mapRef.current) {
          try {
            if (typeof mapRef.current.remove === 'function') {
              mapRef.current.remove();
            }
          } catch (e) {}
          mapRef.current = null;
        }
      };
    }

    // 2. Real Browser Environment: Use Leaflet with Google Maps Roadmap Tiles
    if (!containerRef.current) return;

    try {
      // Clear previous container id to prevent "Map container is already initialized"
      if (containerRef.current._leaflet_id) {
        containerRef.current._leaflet_id = null;
      }

      const initialLat = Number.isFinite(latitude) ? latitude : 21.0285;
      const initialLng = Number.isFinite(longitude) ? longitude : 105.8542;

      const leafletInstance = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(leafletInstance);

      const tileLayer = L.tileLayer(GOOGLE_MAPS_TILE_CONFIG.url, {
        subdomains: GOOGLE_MAPS_TILE_CONFIG.subdomains,
        maxZoom: GOOGLE_MAPS_TILE_CONFIG.maxZoom,
        attribution: GOOGLE_MAPS_TILE_CONFIG.attribution,
      }).addTo(leafletInstance);
      tileLayerRef.current = tileLayer;

      const markersGroup = L.layerGroup().addTo(leafletInstance);
      markersLayerRef.current = markersGroup;
      leafletMapRef.current = leafletInstance;

      // Provide unified map adapter conforming to the existing marker & flyTo contracts
      mapRef.current = {
        rawMap: leafletInstance,
        remove: () => {
          try {
            leafletInstance.remove();
          } catch (e) {}
        },
        flyToLocation: (coords, zoom = 13) => {
          const [lng, lat] = coords;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            leafletInstance.flyTo([lat, lng], zoom, { duration: 0.8 });
          }
        },
        flyTo: (opts) => {
          if (Array.isArray(opts?.center)) {
            const [lng, lat] = opts.center;
            leafletInstance.flyTo([lat, lng], opts.zoom || 13, { duration: 0.8 });
          }
        },
        clearMarkers: () => {
          if (markersLayerRef.current) {
            markersLayerRef.current.clearLayers();
          }
        },
        addMarker: (coords, opts = {}) => {
          const [lng, lat] = coords;
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !markersLayerRef.current) return null;

          const isUser = !opts.title && opts.html?.includes('nearby-user-marker');
          const isSelected = opts.openPopup || opts.html?.includes('is-selected');

          const icon = L.divIcon({
            className: isUser ? 'leaflet-user-marker-wrap' : 'leaflet-device-marker-wrap',
            html: opts.html || '',
            iconSize: isUser ? [22, 22] : [28, 28],
            iconAnchor: isUser ? [11, 11] : [14, 28],
          });

          const marker = L.marker([lat, lng], {
            icon,
            title: opts.title || '',
            zIndexOffset: isUser ? 1000 : (isSelected ? 900 : 100),
          });

          if (opts.popup) {
            marker.bindPopup(opts.popup, {
              maxWidth: 240,
              minWidth: 180,
              offset: [0, -22],
              className: 'nearby-leaflet-popup',
            });
          }

          markersLayerRef.current.addLayer(marker);

          const markerHandle = {
            leafletMarker: marker,
            getElement: () => marker.getElement(),
            on: (event, handler) => {
              marker.on(event, handler);
            },
            getPopup: () => marker.getPopup(),
            togglePopup: () => marker.togglePopup(),
            remove: () => markersLayerRef.current?.removeLayer(marker),
          };

          return markerHandle;
        },
        on: (event, handler) => {
          leafletInstance.on(event, handler);
        },
      };

      setIsMapReady(true);
      setIsLoading(false);
    } catch (err) {
      console.error('[MAP] Init error:', err);
      setIsLoading(false);
      setMapError('Map could not be initialized.');
    }

    return () => {
      isMountedRef.current = false;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {}
        leafletMapRef.current = null;
      }
      mapRef.current = null;
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
              if (typeof marker.togglePopup === 'function' && !marker.getPopup()?.isOpen?.()) {
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
            if (popup) {
              try {
                if (typeof popup.addTo === 'function' && !popup.isOpen?.()) {
                  popup.addTo(map.rawMap || map);
                } else if (typeof marker.leafletMarker?.openPopup === 'function') {
                  marker.leafletMarker.openPopup();
                }
              } catch (e) {
                // ignore popup sync error
              }
            }
          }
        }
      });
    }
  }, [devices, selectedDeviceId, latitude, longitude, onMarkerClick, isMapReady]);

  // Recenter button click
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
          Loading Google Map...
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

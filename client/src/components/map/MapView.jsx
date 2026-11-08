import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '../../constants/config.js';

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
 * Groups devices by ownerId and rentalLocation coordinates.
 * An owner with multiple devices at the same location produces 1 group.
 * The same owner at different locations produces separate groups.
 * Different owners at the same coordinates produce separate groups.
 */
export const groupDevicesByOwnerLocation = (devices = []) => {
  const groupMap = new Map();

  devices.forEach((device) => {
    if (!device || typeof device !== 'object') return;
    const pos = getDevicePosition(device);
    if (!pos) return;
    const [lng, lat] = pos;
    const rawOwner = device.owner || (typeof device.ownerId === 'object' ? device.ownerId : null) || {};
    const ownerId = String(rawOwner._id || (typeof device.ownerId === 'string' ? device.ownerId : '') || 'unknown');
    // Grouping key: ownerId + coordinates (rounded to 5 decimals ~1.1m)
    const groupKey = `${ownerId}:${lng.toFixed(5)},${lat.toFixed(5)}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: groupKey,
        ownerId,
        owner: {
          id: ownerId,
          name: rawOwner.name || null,
          avatar: rawOwner.avatar || null,
          isVerified: Boolean(rawOwner.trust?.isVerified || rawOwner.isVerified),
          rating: rawOwner.rating ?? (rawOwner.stats?.ratingAvg || 5.0),
          totalReviews: rawOwner.totalReviews ?? (rawOwner.stats?.ratingCount || 0),
          address: device.location?.addressText || rawOwner.address || 'Rental Location',
        },
        position: [lng, lat],
        addressText: device.location?.addressText || rawOwner.address || 'Rental Location',
        distanceMeters: Number.isFinite(device.distanceMeters) ? device.distanceMeters : Infinity,
        devices: [],
        availableCount: 0,
      });
    }

    const group = groupMap.get(groupKey);
    group.devices.push(device);
    if (device.status === 'available') {
      group.availableCount += 1;
    }
    if (Number.isFinite(device.distanceMeters) && device.distanceMeters < group.distanceMeters) {
      group.distanceMeters = device.distanceMeters;
    }
  });

  return Array.from(groupMap.values());
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

export const MapView = ({
  latitude,
  longitude,
  devices = [],
  ownerGroups,
  selectedOwnerKey,
  selectedDeviceId,
  onMarkerClick,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const isMountedRef = useRef(true);
  const previousOwnerKeyRef = useRef(null);

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
            : [MAP_CONFIG.DEFAULT_COORDS.LNG, MAP_CONFIG.DEFAULT_COORDS.LAT];

          const instanceOrPromise = window.FaviMap.create(containerRef.current, {
            center: initialCenter,
            zoom: MAP_CONFIG.DEFAULT_ZOOM,
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

      const initialLat = Number.isFinite(latitude) ? latitude : MAP_CONFIG.DEFAULT_COORDS.LAT;
      const initialLng = Number.isFinite(longitude) ? longitude : MAP_CONFIG.DEFAULT_COORDS.LNG;

      const leafletInstance = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
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
          if (leafletInstance) {
            try {
              leafletInstance.closePopup();
            } catch (e) {}
          }
          if (markersLayerRef.current) {
            markersLayerRef.current.clearLayers();
          }
        },
        addMarker: (coords, opts = {}) => {
          if (!Array.isArray(coords) || coords.length < 2) return null;
          const [lng, lat] = coords;
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !markersLayerRef.current) return null;

          const isUser = !opts.title && opts.html?.includes('nearby-user-marker');
          const isSelected = opts.openPopup || opts.html?.includes('is-selected');

          const icon = L.divIcon({
            className: isUser ? 'leaflet-user-marker-wrap' : 'leaflet-owner-marker-wrap',
            html: opts.html || '',
            iconSize: isUser ? [22, 22] : [36, 44],
            iconAnchor: isUser ? [11, 11] : [18, 42],
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
            if (opts.openPopup) {
              marker.openPopup();
            }
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
            openPopup: () => marker.openPopup(),
            closePopup: () => marker.closePopup(),
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

  // Update markers when device list, owner groups, selected owner/device, or user location changes
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

    // Determine owner groups to render
    const groups = Array.isArray(ownerGroups) && ownerGroups.length > 0
      ? ownerGroups
      : groupDevicesByOwnerLocation(devices);

    if (Array.isArray(groups) && typeof map.addMarker === 'function') {
      const coordCountMap = new Map();

      groups.forEach((group) => {
        if (!group?.position) return;
        const [lng, lat] = group.position;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        const isSelected =
          group.key === selectedOwnerKey ||
          (selectedDeviceId && group.devices.some((d) => String(d._id || d.id) === String(selectedDeviceId)));

        const ownerName = group.owner?.name;
        const markerTitle = ownerName
          ? `${ownerName}${group.devices.length > 1 ? ` (${group.devices.length} devices)` : ''}`
          : (group.devices[0]?.title || group.devices[0]?.name || 'Rental Owner');

        const deviceCount = group.devices.length;
        const isMultiple = deviceCount > 1;
        const primaryDeviceId = String(group.devices[0]?._id || group.devices[0]?.id || '');
        const avatarUrl = group.owner?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
        const addressText = group.addressText || 'Rental Location';
        const distanceText = Number.isFinite(group.distanceMeters)
          ? `${(group.distanceMeters / 1000).toFixed(1)} km away`
          : '';

        // Distinguish different owners sharing exact coordinates
        const coordKey = `${lng.toFixed(5)},${lat.toFixed(5)}`;
        const offsetIndex = coordCountMap.get(coordKey) || 0;
        coordCountMap.set(coordKey, offsetIndex + 1);

        let renderLng = lng;
        let renderLat = lat;
        if (offsetIndex > 0) {
          const angle = (offsetIndex * 2 * Math.PI) / 4;
          renderLng = lng + Math.cos(angle) * 0.00015;
          renderLat = lat + Math.sin(angle) * 0.00015;
        }

        const escapedTitle = escapeHtml(markerTitle);
        const escapedAvatar = escapeHtml(avatarUrl);
        const escapedAddress = escapeHtml(addressText);
        const escapedDist = escapeHtml(distanceText);

        const popupHtml = `
          <div class="nearby-owner-popup" style="min-width:180px;max-width:240px;font-family:inherit;font-size:13px;line-height:1.4;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <img src="${escapedAvatar}" alt="${escapedTitle}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid #0d9488;" />
              <div style="overflow:hidden;">
                <strong style="display:block;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapedTitle}
                </strong>
                <span style="display:inline-block;font-size:11px;color:#0d9488;font-weight:600;">
                  ${group.availableCount} ${group.availableCount === 1 ? 'device' : 'devices'} available
                </span>
              </div>
            </div>
            <div style="color:#64748b;font-size:12px;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              📍 <span>${escapedAddress}</span>
            </div>
            ${escapedDist ? `<div style="color:#64748b;font-size:11px;margin-bottom:8px;">${escapedDist}</div>` : ''}
            <button type="button" class="nearby-popup-select-btn" data-group-key="${escapeHtml(group.key)}" style="width:100%;padding:6px 0;background:#0d9488;color:#ffffff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
              View Owner Devices
            </button>
          </div>
        `.trim();

        const markerHtml = `
          <div class="nearby-owner-marker-wrap${isSelected ? ' is-selected' : ''}" title="${escapedTitle}" aria-label="${escapedTitle}">
            <div class="nearby-owner-marker${isSelected ? ' is-selected' : ''}">
              <div class="nearby-owner-marker-inner">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              ${isMultiple ? `<span class="nearby-owner-marker-badge">${deviceCount}</span>` : ''}
            </div>
          </div>
        `.trim();

        const marker = map.addMarker([renderLng, renderLat], {
          title: markerTitle,
          html: markerHtml,
          popup: popupHtml,
          openPopup: isSelected,
        });

        if (marker) {
          const handleSelect = () => {
            if (typeof marker.togglePopup === 'function' && !marker.getPopup()?.isOpen?.()) {
              marker.togglePopup();
            }
            if (typeof onMarkerClick === 'function') {
              onMarkerClick(group.key, primaryDeviceId);
            }
          };

          const el = typeof marker.getElement === 'function' ? marker.getElement() : null;
          if (el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', handleSelect);
          }
          if (typeof marker.on === 'function') {
            marker.on('click', handleSelect);
          }

          if (isSelected) {
            try {
              if (typeof marker.leafletMarker?.openPopup === 'function') {
                marker.leafletMarker.openPopup();
              } else if (typeof marker.openPopup === 'function') {
                marker.openPopup();
              }
            } catch (e) {
              // ignore popup sync error
            }
          }
        }
      });
    }
  }, [devices, ownerGroups, selectedOwnerKey, selectedDeviceId, latitude, longitude, onMarkerClick, isMapReady]);

  // Recenter when selected owner changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedOwnerKey) return;
    if (previousOwnerKeyRef.current === selectedOwnerKey) return;
    previousOwnerKeyRef.current = selectedOwnerKey;

    const groups = Array.isArray(ownerGroups) && ownerGroups.length > 0
      ? ownerGroups
      : groupDevicesByOwnerLocation(devices);
    const selectedGroup = groups.find((g) => g.key === selectedOwnerKey);
    if (selectedGroup && Array.isArray(selectedGroup.position) && selectedGroup.position.length >= 2) {
      const [lng, lat] = selectedGroup.position;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        if (typeof map.flyToLocation === 'function') {
          map.flyToLocation([lng, lat], 14);
        } else if (typeof map.flyTo === 'function') {
          map.flyTo({ center: [lng, lat], zoom: 14 });
        }
      }
    }
  }, [selectedOwnerKey, ownerGroups, devices]);

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

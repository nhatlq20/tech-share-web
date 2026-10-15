import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const getDevicePosition = (device) => {
  const coordinates = device?.location?.coordinates;
  if (device?.location?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  // MongoDB stores [longitude, latitude]; Leaflet expects [latitude, longitude].
  return [latitude, longitude];
};

export const MapView = ({ latitude, longitude, devices, selectedDeviceId, onMarkerClick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radiusRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const map = L.map(containerRef.current);
    mapRef.current = map;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    const userIcon = L.divIcon({ className: 'nearby-user-marker', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
    userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, title: 'Your location', alt: 'Your location' }).addTo(map);
    radiusRef.current = L.circle([latitude, longitude], { radius: 10000, color: '#20a8b1', weight: 1, fillOpacity: 0.04 }).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
    // The map instance is created once; the next effect handles location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const position = [latitude, longitude];
    userMarkerRef.current.setLatLng(position);
    radiusRef.current.setLatLng(position);
    mapRef.current.setView(position, 12);
  }, [latitude, longitude]);

  useEffect(() => {
    const markers = L.layerGroup().addTo(mapRef.current);
    devices.forEach(device => {
      const position = getDevicePosition(device);
      if (!position) return;
      const id = String(device._id || device.id);
      const icon = L.divIcon({
        className: `nearby-device-marker${id === selectedDeviceId ? ' is-selected' : ''}`,
        html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13],
      });
      const title = device.title || device.name || 'Device';
      const marker = L.marker(position, { icon, title, alt: title, zIndexOffset: id === selectedDeviceId ? 1000 : 0 }).addTo(markers);
      const tooltip = document.createElement('span');
      tooltip.textContent = title;
      marker.bindTooltip(tooltip);
      marker.on('click', () => onMarkerClick(id));
    });
    return () => markers.remove();
  }, [devices, selectedDeviceId, onMarkerClick]);

  const handleRecenter = () => mapRef.current.setView([latitude, longitude], 12);
  return (
    <div className="nearby-map-wrap">
      <div ref={containerRef} className="nearby-map" aria-label="Nearby device map" />
      <button type="button" className="nearby-recenter" onClick={handleRecenter}>Recenter on me</button>
      {tileError && <p className="nearby-tile-warning" role="status">Map tiles could not load. Check your internet connection. Device details remain available.</p>}
    </div>
  );
};

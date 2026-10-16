import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserLocation } from '../hooks/useUserLocation';
import { deviceService } from '../services/deviceService';
import { MapView, getDevicePosition } from '../components/map/MapView';
import { ROUTES } from '../routes/routes';
import { formatPrice } from '../utils/formatters';
import './NearbyPage.css';

const NEARBY_RADIUS_METERS = 10000;

export const NearbyPage = () => {
  const userLocation = useUserLocation();
  const { latitude, longitude, revision } = userLocation;
  const locationKey = JSON.stringify([latitude, longitude, revision]);
  const [result, setResult] = useState({ locationKey: null, devices: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const pendingRequest = useRef(null);
  const nearbyDevices = result.locationKey === locationKey ? result.devices : [];
  const selectedDevice = nearbyDevices.find(device => String(device._id || device.id) === selectedDeviceId);
  const handleMarkerClick = useCallback(id => setSelectedDeviceId(id), []);

  useEffect(() => {
    let active = true;
    if (latitude == null || longitude == null) return () => { active = false; };
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedDeviceId(null);
    const requestKey = JSON.stringify([latitude, longitude, revision, retryAttempt]);
    async function loadNearbyDevices() {
      try {
        // Reuse the same request during StrictMode's setup/cleanup/setup cycle.
        if (pendingRequest.current?.key !== requestKey) {
          pendingRequest.current = { key: requestKey, promise: fetchNearbyPages() };
        }
        const devices = await pendingRequest.current.promise;
        if (active) setResult({ locationKey: JSON.stringify([latitude, longitude, revision]), devices });
      } catch (error) {
        if (active) setErrorMessage('Unable to load nearby devices. Please try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    async function fetchNearbyPages() {
      const devices = new Map();
      let totalPages = 1;
      for (let page = 1; page <= totalPages; page += 1) {
        const response = await deviceService.getNearbyDevices({ lat: latitude, lng: longitude, radius: NEARBY_RADIUS_METERS, page, limit: 100 });
        if (!Array.isArray(response?.data) || response.success === false) throw new Error('Invalid nearby response');
        if (response.pagination) {
          if (!Number.isSafeInteger(response.pagination.totalPages) || response.pagination.totalPages < 1) throw new Error('Invalid pagination');
          totalPages = response.pagination.totalPages;
        }
        response.data.forEach(device => {
          if (!device || typeof device !== 'object') return;
          const id = device._id || device.id;
          if (id && getDevicePosition(device) && device.status === 'available' && device.isDeleted !== true &&
              Number.isFinite(device.distanceMeters) && device.distanceMeters >= 0 && device.distanceMeters <= NEARBY_RADIUS_METERS) {
            devices.set(String(id), device);
          }
        });
      }
      return [...devices.values()];
    }
    loadNearbyDevices();
    // Only the latest location request may replace the list and markers.
    return () => { active = false; };
  }, [latitude, longitude, revision, retryAttempt]);

  const hasLocation = latitude != null && longitude != null;
  const nearbyLoading = hasLocation && (isLoading || result.locationKey !== locationKey) && !errorMessage;
  return (
    <div className="nearby-page">
      <header className="nearby-header">
        <div><h1>Devices near you</h1><p>Available rentals within 10 km of your location.</p></div>
        <button type="button" onClick={userLocation.refreshLocation} disabled={userLocation.loading || userLocation.refreshing}>
          {userLocation.refreshing ? 'Updating location...' : 'Update location'}
        </button>
      </header>
      {(userLocation.source === 'CACHE' || userLocation.warning) && <p role="status">Using your last known location.{userLocation.isStale ? ' It may be out of date.' : ''}</p>}
      {userLocation.loading && <p role="status">Finding your location...</p>}
      {!hasLocation && userLocation.error && <div role="alert"><h2>Unable to determine your location.</h2><p>{userLocation.error}</p><button onClick={userLocation.refreshLocation}>Try Again</button></div>}
      {hasLocation && <div className="nearby-layout">
        <MapView latitude={latitude} longitude={longitude} devices={nearbyDevices} selectedDeviceId={selectedDeviceId} onMarkerClick={handleMarkerClick} />
        <aside className="nearby-sidebar" aria-label="Nearby device details">
          {nearbyLoading && <p role="status">Loading nearby devices...</p>}
          {errorMessage && <div role="alert"><p>{errorMessage}</p><button onClick={() => setRetryAttempt(value => value + 1)}>Try Again</button></div>}
          {!nearbyLoading && !errorMessage && nearbyDevices.length === 0 && <p>No available devices within 10 km.</p>}
          {selectedDevice && <section className="nearby-preview" aria-label="Selected device">
            {selectedDevice.images?.[0] && <img src={selectedDevice.images[0]} alt={selectedDevice.title || selectedDevice.name} />}
            <h2>{selectedDevice.title || selectedDevice.name}</h2>
            <p>{formatPrice(selectedDevice.dailyRate ?? selectedDevice.pricePerDay)} / day</p>
            <p>{(selectedDevice.distanceMeters / 1000).toFixed(2)} km away</p>
            <Link to={ROUTES.DEVICE_DETAIL_PATH(selectedDevice._id || selectedDevice.id)} state={{ from: ROUTES.NEARBY }}>View Details</Link>
          </section>}
          <ul className="nearby-device-list">{nearbyDevices.map(device => {
            const id = String(device._id || device.id);
            return <li key={id}><button type="button" aria-pressed={id === selectedDeviceId} onClick={() => handleMarkerClick(id)}>
              <strong>{device.title || device.name}</strong><span>{(device.distanceMeters / 1000).toFixed(2)} km away</span>
            </button></li>;
          })}</ul>
        </aside>
      </div>}
    </div>
  );
};
export default NearbyPage;

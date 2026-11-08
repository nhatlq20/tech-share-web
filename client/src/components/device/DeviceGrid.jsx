import React from 'react';
import { DeviceCard } from './DeviceCard.jsx';
import './DeviceGrid.css';

/**
 * Reusable Device Grid component for rendering a list of device cards.
 *
 * @param {Object} props
 * @param {import('../../types/device.js').Device[]} props.devices List of device items to display
 * @param {{ lat: number, lng: number }|null} [props.userCoordinates] Optional user coordinates
 * @param {Function} [props.onFavoriteChange] Optional favorite change callback
 */
export const DeviceGrid = ({ devices = [], userCoordinates = null, onFavoriteChange = null }) => {
  if (!Array.isArray(devices) || devices.length === 0) {
    return null;
  }

  return (
    <div className="device-grid" role="region" aria-label="Devices grid">
      {devices.map((device) => {
        const key = device._id || device.id || Math.random().toString();
        return (
          <DeviceCard
            key={key}
            device={device}
            userCoordinates={userCoordinates}
            onFavoriteChange={onFavoriteChange}
          />
        );
      })}
    </div>
  );
};

export default DeviceGrid;

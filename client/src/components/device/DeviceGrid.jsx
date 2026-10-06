import React from 'react';
import { DeviceCard } from './DeviceCard.jsx';
import './DeviceGrid.css';

/**
 * Reusable Device Grid component for rendering a list of device cards.
 *
 * @param {Object} props
 * @param {import('../../types/device.js').Device[]} props.devices List of device items to display
 */
export const DeviceGrid = ({ devices = [] }) => {
  if (!Array.isArray(devices) || devices.length === 0) {
    return null;
  }

  return (
    <div className="device-grid" role="region" aria-label="Devices grid">
      {devices.map((device) => {
        const key = device._id || device.id || Math.random().toString();
        return <DeviceCard key={key} device={device} />;
      })}
    </div>
  );
};

export default DeviceGrid;

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeftRight, ImageOff, LoaderCircle, Search, Sparkles, X } from 'lucide-react';
import { ComparisonTable } from '../components/ComparisonTable.jsx';
import { formatCategoryLabel } from '../components/device/DeviceCard.jsx';
import { compareDevices, getDevices } from '../services/aiCompareService.js';
import { formatPrice } from '../utils/formatters.js';
import './AiDeviceComparePage.css';

const getDeviceId = (device) => String(device?._id || device?.id || '');

const getDeviceName = (device) => device?.title || device?.name || 'Untitled device';

const DeviceSelector = ({ label, selectedDevice, excludedDeviceId, onSelect, onClear, disabled }) => {
  const [searchText, setSearchText] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDevices({ q: searchText.trim() });
        if (!Array.isArray(response?.data)) {
          throw new Error('The device list response is invalid.');
        }
        if (active) setDevices(response.data);
      } catch (requestError) {
        if (active) {
          setDevices([]);
          setError(requestError.message || 'Unable to load devices. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText]);

  const availableDevices = devices.filter((device) => (
    getDeviceId(device) && getDeviceId(device) !== excludedDeviceId
  ));

  return (
    <section className="compare-picker" aria-label={label}>
      <div className="compare-picker-title">
        <span className="compare-picker-number">{label === 'Device 1' ? '01' : '02'}</span>
        <div>
          <h2>{label}</h2>
          <p>Choose a device from the catalog</p>
        </div>
      </div>

      {selectedDevice ? (
        <article className="compare-selected-device">
          <div className="compare-selected-image">
            {selectedDevice.images?.[0] ? (
              <img src={selectedDevice.images[0]} alt={getDeviceName(selectedDevice)} />
            ) : (
              <ImageOff size={28} aria-label="No device image" />
            )}
          </div>
          <div className="compare-selected-info">
            <span>{selectedDevice.brand || 'Brand N/A'}</span>
            <h3>{getDeviceName(selectedDevice)}</h3>
            <p>{formatCategoryLabel(selectedDevice.category) || 'Category N/A'}</p>
            <strong>
              {typeof (selectedDevice.dailyRate ?? selectedDevice.pricePerDay) === 'number'
                ? `${formatPrice(selectedDevice.dailyRate ?? selectedDevice.pricePerDay)} / day`
                : 'Price N/A'}
            </strong>
          </div>
          <button
            type="button"
            className="compare-clear-device"
            onClick={onClear}
            disabled={disabled}
            aria-label={`Remove ${getDeviceName(selectedDevice)}`}
          >
            <X size={17} />
          </button>
        </article>
      ) : (
        <>
          <label className="compare-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search {label.toLowerCase()}</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by device name, brand, or category"
              disabled={disabled}
            />
          </label>

          <div className="compare-device-options" aria-live="polite">
            {loading ? (
              <p className="compare-picker-message">
                <LoaderCircle size={17} className="compare-spinner" /> Loading devices...
              </p>
            ) : error ? (
              <p className="compare-picker-message compare-error-message">
                <AlertCircle size={17} /> {error}
              </p>
            ) : availableDevices.length ? (
              availableDevices.map((device) => (
                <button
                  type="button"
                  className="compare-device-option"
                  key={getDeviceId(device)}
                  onClick={() => onSelect(device)}
                  disabled={disabled}
                >
                  <span className="compare-option-image">
                    {device.images?.[0] ? (
                      <img src={device.images[0]} alt="" />
                    ) : (
                      <ImageOff size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="compare-option-info">
                    <strong>{getDeviceName(device)}</strong>
                    <span>{device.brand || 'Brand N/A'} · {formatCategoryLabel(device.category) || 'Category N/A'}</span>
                  </span>
                  <span className="compare-option-price">
                    {typeof (device.dailyRate ?? device.pricePerDay) === 'number'
                      ? `${formatPrice(device.dailyRate ?? device.pricePerDay)} / day`
                      : 'Price N/A'}
                  </span>
                </button>
              ))
            ) : (
              <p className="compare-picker-message">
                No devices match your search. Try another name, brand, or category.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export const AiDeviceComparePage = () => {
  const [device1, setDevice1] = useState(null);
  const [device2, setDevice2] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestInProgress = useRef(false);
  const currentRequest = useRef(0);

  const selectDevice = (slot, device) => {
    const otherDevice = slot === 1 ? device2 : device1;
    if (device && getDeviceId(device) === getDeviceId(otherDevice)) return;
    if (slot === 1) setDevice1(device);
    else setDevice2(device);
    currentRequest.current += 1;
    setComparison(null);
    setError('');
  };

  const handleCompare = async () => {
    if (!device1 || !device2 || requestInProgress.current) return;

    requestInProgress.current = true;
    const requestId = ++currentRequest.current;
    const firstDeviceId = getDeviceId(device1);
    const secondDeviceId = getDeviceId(device2);
    setLoading(true);
    setError('');
    setComparison(null);

    try {
      const result = await compareDevices(firstDeviceId, secondDeviceId);
      if (requestId === currentRequest.current) setComparison(result);
    } catch (requestError) {
      if (requestId === currentRequest.current) {
        const status = requestError.status;
        setError(
          status === 404 || status === 503
            ? 'The AI comparison service is currently unavailable. Please try again later.'
            : requestError.message || 'Unable to compare these devices. Please try again.'
        );
      }
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  };

  return (
    <div className="ai-compare-page">
      <div className="ai-compare-container">
        <header className="ai-compare-header">
          <span className="ai-compare-kicker"><Sparkles size={16} /> Find your best rental match</span>
          <h1>AI Device Comparison</h1>
          <p>Compare two devices with AI to find the best rental option.</p>
        </header>

        <div className="compare-picker-grid">
          <DeviceSelector
            label="Device 1"
            selectedDevice={device1}
            excludedDeviceId={getDeviceId(device2)}
            disabled={loading}
            onSelect={(device) => selectDevice(1, device)}
            onClear={() => selectDevice(1, null)}
          />
          <div className="compare-versus" aria-hidden="true">
            <span><ArrowLeftRight size={20} /></span>
            <small>VS</small>
          </div>
          <DeviceSelector
            label="Device 2"
            selectedDevice={device2}
            excludedDeviceId={getDeviceId(device1)}
            disabled={loading}
            onSelect={(device) => selectDevice(2, device)}
            onClear={() => selectDevice(2, null)}
          />
        </div>

        <div className="compare-action-area">
          <button
            type="button"
            className="compare-submit-button"
            onClick={handleCompare}
            disabled={!device1 || !device2 || loading}
          >
            {loading ? (
              <><LoaderCircle size={18} className="compare-spinner" /> Comparing devices...</>
            ) : (
              <><Sparkles size={18} /> Compare with AI</>
            )}
          </button>
          {error && (
            <p className="compare-request-error" role="alert">
              <AlertCircle size={18} /> {error}
            </p>
          )}
        </div>

        {comparison !== null && comparison !== undefined && (
          <ComparisonTable device1={device1} device2={device2} comparison={comparison} />
        )}
      </div>
    </div>
  );
};

export default AiDeviceComparePage;

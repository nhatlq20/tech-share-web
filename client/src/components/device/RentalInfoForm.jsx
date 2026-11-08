import React from 'react';

const formatVnd = (value) => {
  if (!value) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(value));
};

const RentalInfoForm = ({ values, errors, onChange, onGetCurrentLocation }) => {
  const handlePriceChange = (field, value) => {
    onChange(field, value.replace(/\D/g, ''));
  };

  return (
    <div className="post-device-fields">
      <label className="post-device-field">
        <span>Daily Rental Price <b>*</b></span>
        <div className={`post-device-currency ${errors.pricePerDay ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={formatVnd(values.pricePerDay)}
            onChange={(event) => handlePriceChange('pricePerDay', event.target.value)}
            placeholder="250,000"
            aria-invalid={Boolean(errors.pricePerDay)}
          />
          <span>₫</span>
        </div>
        {errors.pricePerDay && <small className="post-device-error">{errors.pricePerDay}</small>}
      </label>

      <label className="post-device-field">
        <span>Security Deposit <b>*</b></span>
        <div className={`post-device-currency ${errors.depositAmount ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={formatVnd(values.depositAmount)}
            onChange={(event) => handlePriceChange('depositAmount', event.target.value)}
            placeholder="1,500,000"
            aria-invalid={Boolean(errors.depositAmount)}
          />
          <span>₫</span>
        </div>
        {errors.depositAmount && <small className="post-device-error">{errors.depositAmount}</small>}
      </label>

      <label className="post-device-field post-device-field-wide">
        <span>Device Address <b>*</b></span>
        <input
          className={errors.addressText ? 'has-error' : ''}
          value={values.addressText}
          onChange={(event) => onChange('addressText', event.target.value)}
          placeholder="Street address, ward, district, city/province"
          aria-invalid={Boolean(errors.addressText)}
        />
        {errors.addressText && <small className="post-device-error">{errors.addressText}</small>}
        <small className="post-device-hint">Enter the device pickup and return address.</small>
      </label>

      <div className="post-device-location-heading post-device-field-wide">
        <div>
          <span>Location Coordinates <b>*</b></span>
          <small className="post-device-hint">
            Coordinates are required to show your device on the map and in nearby searches.
          </small>
        </div>
        <button type="button" onClick={onGetCurrentLocation}>
          Use My Current Location
        </button>
      </div>

      <label className="post-device-field">
        <span>Latitude <b>*</b></span>
        <input
          type="number"
          step="any"
          min="-90"
          max="90"
          className={errors.latitude ? 'has-error' : ''}
          value={values.latitude}
          onChange={(event) => onChange('latitude', event.target.value)}
          placeholder="e.g. 21.0285"
          aria-invalid={Boolean(errors.latitude)}
        />
        {errors.latitude && <small className="post-device-error">{errors.latitude}</small>}
      </label>

      <label className="post-device-field">
        <span>Longitude <b>*</b></span>
        <input
          type="number"
          step="any"
          min="-180"
          max="180"
          className={errors.longitude ? 'has-error' : ''}
          value={values.longitude}
          onChange={(event) => onChange('longitude', event.target.value)}
          placeholder="e.g. 105.8542"
          aria-invalid={Boolean(errors.longitude)}
        />
        {errors.longitude && <small className="post-device-error">{errors.longitude}</small>}
      </label>
      {errors.location && (
        <small className="post-device-error post-device-field-wide">
          {errors.location}
        </small>
      )}
    </div>
  );
};

export default RentalInfoForm;

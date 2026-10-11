import React from 'react';

const formatVnd = (value) => {
  if (!value) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(value));
};

const RentalInfoForm = ({ values, errors, onChange }) => {
  const handlePriceChange = (field, value) => {
    onChange(field, value.replace(/\D/g, ''));
  };

  return (
    <div className="post-device-fields">
      <label className="post-device-field">
        <span>Giá thuê mỗi ngày <b>*</b></span>
        <div className={`post-device-currency ${errors.pricePerDay ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={formatVnd(values.pricePerDay)}
            onChange={(event) => handlePriceChange('pricePerDay', event.target.value)}
            placeholder="250.000"
            aria-invalid={Boolean(errors.pricePerDay)}
          />
          <span>₫</span>
        </div>
        {errors.pricePerDay && <small className="post-device-error">{errors.pricePerDay}</small>}
      </label>

      <label className="post-device-field">
        <span>Tiền đặt cọc <b>*</b></span>
        <div className={`post-device-currency ${errors.depositAmount ? 'has-error' : ''}`}>
          <input
            inputMode="numeric"
            value={formatVnd(values.depositAmount)}
            onChange={(event) => handlePriceChange('depositAmount', event.target.value)}
            placeholder="1.500.000"
            aria-invalid={Boolean(errors.depositAmount)}
          />
          <span>₫</span>
        </div>
        {errors.depositAmount && <small className="post-device-error">{errors.depositAmount}</small>}
      </label>

      <label className="post-device-field post-device-field-wide">
        <span>Địa chỉ thiết bị <b>*</b></span>
        <input
          className={errors.addressText ? 'has-error' : ''}
          value={values.addressText}
          onChange={(event) => onChange('addressText', event.target.value)}
          placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
          aria-invalid={Boolean(errors.addressText)}
        />
        {errors.addressText && <small className="post-device-error">{errors.addressText}</small>}
        <small className="post-device-hint">Nhập địa chỉ nhận/trả thiết bị.</small>
      </label>
    </div>
  );
};

export default RentalInfoForm;

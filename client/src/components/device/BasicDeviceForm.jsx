import React from "react";

const categories = [
  { value: "smartphone", label: "Điện thoại" },
  { value: "laptop", label: "Laptop" },
  { value: "camera", label: "Máy ảnh" },
  { value: "drone", label: "Flycam" },
  { value: "audio", label: "Thiết bị âm thanh" },
  { value: "accessory", label: "Phụ kiện" },
  { value: "tablet", label: "Máy tính bảng" },
  { value: "other", label: "Khác" },
];

const BasicDeviceForm = ({ values, errors, onChange }) => (
  <div className="post-device-fields">
    <label className="post-device-field post-device-field-wide">
      <span>
        Tên thiết bị <b>*</b>
      </span>
      <input
        className={errors.name ? "has-error" : ""}
        value={values.name}
        onChange={(event) => onChange("name", event.target.value)}
        placeholder="Ví dụ: MacBook Pro 14 inch M3"
        aria-invalid={Boolean(errors.name)}
      />
      {errors.name && (
        <small className="post-device-error">{errors.name}</small>
      )}
    </label>

    <label className="post-device-field">
      <span>
        Danh mục <b>*</b>
      </span>
      <select
        className={errors.category ? "has-error" : ""}
        value={values.category}
        onChange={(event) => onChange("category", event.target.value)}
        aria-invalid={Boolean(errors.category)}
      >
        <option value="">Chọn danh mục</option>
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      {errors.category && (
        <small className="post-device-error">{errors.category}</small>
      )}
    </label>

    <label className="post-device-field">
      <span>
        Thương hiệu <b>*</b>
      </span>
      <input
        className={errors.brand ? "has-error" : ""}
        value={values.brand}
        onChange={(event) => onChange("brand", event.target.value)}
        placeholder="Ví dụ: Apple"
        aria-invalid={Boolean(errors.brand)}
      />
      {errors.brand && (
        <small className="post-device-error">{errors.brand}</small>
      )}
    </label>

    <label className="post-device-field">
      <span>Năm sản xuất</span>
      <input
        type="number"
        min="1900"
        max={new Date().getFullYear()}
        value={values.yearOfManufacture}
        onChange={(event) => onChange("yearOfManufacture", event.target.value)}
        placeholder="2024"
      />
      {errors.yearOfManufacture && (
        <small className="post-device-error">{errors.yearOfManufacture}</small>
      )}
    </label>

    <label className="post-device-field">
      <span>Tình trạng thiết bị</span>
      <select
        value={values.condition}
        onChange={(event) => onChange("condition", event.target.value)}
      >
        <option value="">Chọn tình trạng</option>
        <option value="new">Mới</option>
        <option value="like_new">Như mới</option>
        <option value="good">Tốt</option>
        <option value="fair">Đã qua sử dụng</option>
      </select>
    </label>

    <label className="post-device-field post-device-field-wide">
      <span>
        Mô tả <b>*</b>
      </span>
      <textarea
        className={errors.description ? "has-error" : ""}
        rows={5}
        value={values.description}
        onChange={(event) => onChange("description", event.target.value)}
        placeholder="Mô tả tình trạng, phụ kiện đi kèm và những lưu ý khi sử dụng..."
        aria-invalid={Boolean(errors.description)}
      />
      {errors.description && (
        <small className="post-device-error">{errors.description}</small>
      )}
    </label>
  </div>
);

export default BasicDeviceForm;

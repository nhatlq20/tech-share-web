import React, { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

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

const BasicDeviceForm = ({
  values,
  errors,
  onChange,
  onAddImages,
  onRemoveImage,
}) => {
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const previews = values.images.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImagePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [values.images]);

  const handleImageChange = (event) => {
    onAddImages(Array.from(event.target.files || []));
    event.target.value = "";
  };

  return (
    <div className="post-device-fields">
      <label className="post-device-field post-device-field-wide">
        <span>
          Tiêu đề bài đăng <b>*</b>
        </span>

        <input
          className={errors.title ? "has-error" : ""}
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Ví dụ: Cho thuê MacBook Pro M3 giá tốt tại Cần Thơ"
          aria-invalid={Boolean(errors.title)}
        />

        {errors.title && (
          <small className="post-device-error">{errors.title}</small>
        )}
      </label>
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
        <span>
          Năm sản xuất <b>*</b>
        </span>
        <input
          type="number"
          min="1990"
          max={new Date().getFullYear()}
          value={values.yearOfManufacture}
          onChange={(event) =>
            onChange("yearOfManufacture", event.target.value)
          }
          placeholder="2024"
        />
        {errors.yearOfManufacture && (
          <small className="post-device-error">
            {errors.yearOfManufacture}
          </small>
        )}
      </label>

      <label className="post-device-field">
        <span>
          Tình trạng thiết bị <b>*</b>
        </span>
        <select
          className={errors.condition ? "has-error" : ""}
          value={values.condition}
          onChange={(event) => onChange("condition", event.target.value)}
          aria-invalid={Boolean(errors.condition)}
        >
          <option value="">Chọn tình trạng</option>
          <option value="new">Mới</option>
          <option value="like_new">Như mới</option>
          <option value="good">Tốt</option>
          <option value="fair">Đã qua sử dụng</option>
        </select>
        {errors.condition && (
          <small className="post-device-error">{errors.condition}</small>
        )}
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

      <div className="post-device-image-field post-device-field-wide">
        <div className="post-device-image-heading">
          <div>
            <span>
              Ảnh thiết bị <b>*</b>
            </span>
            <small>Chọn từ 2 đến 3 ảnh, định dạng JPG, PNG hoặc WEBP.</small>
          </div>
          <span className="post-device-image-count">
            {values.images.length}/3 ảnh
          </span>
        </div>

        {imagePreviews.length > 0 && (
          <div className="post-device-image-list">
            {imagePreviews.map((preview, index) => (
              <div
                className="post-device-image-preview"
                key={`${preview.file.name}-${index}`}
              >
                <img src={preview.url} alt={`Ảnh thiết bị ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  aria-label={`Xóa ảnh ${index + 1}`}
                  title="Xóa ảnh"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {values.images.length < 3 && (
          <label className="post-device-image-picker">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
            />
            <ImagePlus size={19} />
            <span>
              {values.images.length ? "Chọn thêm ảnh" : "Chọn ảnh thiết bị"}
            </span>
          </label>
        )}

        {errors.images && (
          <small className="post-device-error">{errors.images}</small>
        )}
        {errors.imageUpload && (
          <small className="post-device-error">{errors.imageUpload}</small>
        )}
      </div>
    </div>
  );
};

export default BasicDeviceForm;

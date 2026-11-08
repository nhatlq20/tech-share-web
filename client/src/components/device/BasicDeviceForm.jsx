import React, { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Sparkles, Trash2 } from "lucide-react";

const categories = [
  { value: "smartphone", label: "Smartphone" },
  { value: "laptop", label: "Laptop" },
  { value: "camera", label: "Camera" },
  { value: "drone", label: "Drone" },
  { value: "audio", label: "Audio Equipment" },
  { value: "accessory", label: "Accessories" },
  { value: "tablet", label: "Tablet" },
  { value: "other", label: "Other" },
];

const BasicDeviceForm = ({
  values,
  errors,
  onChange,
  onAddImages,
  onRemoveImage,
  onGenerateDescription,
  canGenerateDescription,
  isGeneratingDescription,
  descriptionGenerationError,
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
          Listing Title <b>*</b>
        </span>

        <input
          className={errors.title ? "has-error" : ""}
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="e.g. MacBook Pro M3 available for rent in Can Tho"
          aria-invalid={Boolean(errors.title)}
        />

        {errors.title && (
          <small className="post-device-error">{errors.title}</small>
        )}
      </label>
      <label className="post-device-field post-device-field-wide">
        <span>
          Device Name <b>*</b>
        </span>
        <input
          className={errors.name ? "has-error" : ""}
          value={values.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="e.g. MacBook Pro 14-inch M3"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && (
          <small className="post-device-error">{errors.name}</small>
        )}
      </label>

      <label className="post-device-field">
        <span>
          Category <b>*</b>
        </span>
        <select
          className={errors.category ? "has-error" : ""}
          value={values.category}
          onChange={(event) => onChange("category", event.target.value)}
          aria-invalid={Boolean(errors.category)}
        >
          <option value="">Select a category</option>
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
          Brand <b>*</b>
        </span>
        <input
          className={errors.brand ? "has-error" : ""}
          value={values.brand}
          onChange={(event) => onChange("brand", event.target.value)}
          placeholder="e.g. Apple"
          aria-invalid={Boolean(errors.brand)}
        />
        {errors.brand && (
          <small className="post-device-error">{errors.brand}</small>
        )}
      </label>

      <label className="post-device-field">
        <span>
          Year of Manufacture <b>*</b>
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
          Device Condition <b>*</b>
        </span>
        <select
          className={errors.condition ? "has-error" : ""}
          value={values.condition}
          onChange={(event) => onChange("condition", event.target.value)}
          aria-invalid={Boolean(errors.condition)}
        >
          <option value="">Select a condition</option>
          <option value="new">New</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
        {errors.condition && (
          <small className="post-device-error">{errors.condition}</small>
        )}
      </label>

      <div className="post-device-field post-device-field-wide">
        <div className="post-device-description-heading">
          <label htmlFor="post-device-description">
            Description <b>*</b>
          </label>
          <button
            type="button"
            className="post-device-generate-button"
            onClick={onGenerateDescription}
            disabled={!canGenerateDescription || isGeneratingDescription}
          >
            {isGeneratingDescription ? (
              <LoaderCircle className="post-device-spinner" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {isGeneratingDescription ? "Generating Description..." : "Generate with AI"}
          </button>
        </div>
        <textarea
          id="post-device-description"
          className={errors.description ? "has-error" : ""}
          rows={5}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Describe the device condition, included accessories, and any usage notes..."
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && (
          <small className="post-device-error">{errors.description}</small>
        )}
        {descriptionGenerationError && (
          <small className="post-device-error" role="alert">
            {descriptionGenerationError}
          </small>
        )}
        {!canGenerateDescription && (
          <small className="post-device-hint">
            Enter the device name, category, brand, year of manufacture, and condition to use AI.
          </small>
        )}
      </div>

      <div className="post-device-image-field post-device-field-wide">
        <div className="post-device-image-heading">
          <div>
            <span>
              Device Photos <b>*</b>
            </span>
            <small>Add 2 to 3 photos in JPG, PNG, or WEBP format.</small>
          </div>
          <span className="post-device-image-count">
            {values.images.length}/3 photos
          </span>
        </div>

        {imagePreviews.length > 0 && (
          <div className="post-device-image-list">
            {imagePreviews.map((preview, index) => (
              <div
                className="post-device-image-preview"
                key={`${preview.file.name}-${index}`}
              >
                <img src={preview.url} alt={`Device photo ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  title="Remove photo"
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
              {values.images.length ? "Add More Photos" : "Choose Device Photos"}
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

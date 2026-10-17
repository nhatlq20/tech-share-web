import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getOwnerDevice,
  updateOwnerDevice,
} from "../../services/deviceService";
import {
  compressImage,
  uploadToCloudinaryDirect,
} from "../../services/uploadService";
import { ROUTES } from "../../routes/routes";
import "./EditDevicePage.css";

const categories = [
  ["smartphone", "Điện thoại"],
  ["laptop", "Laptop"],
  ["camera", "Máy ảnh"],
  ["drone", "Flycam"],
  ["audio", "Thiết bị âm thanh"],
  ["tablet", "Máy tính bảng"],
  ["gaming", "Thiết bị gaming"],
  ["accessory", "Phụ kiện"],
  ["other", "Khác"],
];

const conditions = [
  ["new99", "Như mới (99%)"],
  ["used95", "Đã qua sử dụng (95%)"],
  ["scratched", "Có trầy xước"],
  ["new", "Mới"],
  ["like_new", "Như mới"],
  ["good", "Tốt"],
  ["fair", "Đã qua sử dụng"],
];

const initialForm = {
  name: "",
  brand: "",
  category: "",
  yearOfManufacture: "",
  condition: "",
  description: "",
  dailyRate: "",
  depositAmount: "",
  addressText: "",
  latitude: "",
  longitude: "",
  specs: "{}",
};

function EditDevicePage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const imageInputRef = useRef(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    let active = true;
    const loadDevice = async () => {
      try {
        const device = await getOwnerDevice(deviceId);
        if (!active) return;
        setDeviceLoaded(true);
        const coordinates = device.location?.coordinates || [];
        setImages(
          (Array.isArray(device.images) ? device.images : []).map((url) => ({
            url,
            file: null,
          })),
        );
        setForm({
          name: device.name || device.title || "",
          brand: device.brand || "",
          category: device.category || "",
          yearOfManufacture: device.yearOfManufacture || "",
          condition: device.condition || "",
          description: device.description || "",
          dailyRate: device.dailyRate ?? device.pricePerDay ?? "",
          depositAmount: device.depositAmount ?? device.depositValue ?? 0,
          addressText: device.addressText || "",
          longitude: coordinates[0] ?? "",
          latitude: coordinates[1] ?? "",
          specs: JSON.stringify(device.specs || {}, null, 2),
        });
      } catch (loadError) {
        if (active) setError(loadError.message || "Không thể tải thiết bị.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDevice();
    return () => {
      active = false;
      imagesRef.current.forEach((image) => {
        if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, [deviceId]);

  const handleImageSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );
    const remainingSlots = 8 - images.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setImages((current) => [
        ...current,
        ...filesToAdd.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }

    if (validFiles.length !== selectedFiles.length) {
      setImageError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP tối đa 10MB mỗi ảnh.");
    } else if (validFiles.length > remainingSlots) {
      setImageError("Thiết bị có thể có tối đa 8 ảnh.");
    } else {
      setImageError("");
    }
    setFieldErrors((current) => ({ ...current, images: "" }));
  };

  const handleRemoveImage = (imageIndex) => {
    setImages((current) => {
      const imageToRemove = current[imageIndex];
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return current.filter((_, index) => index !== imageIndex);
    });
    setImageError("");
    setFieldErrors((current) => ({ ...current, images: "" }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = {};
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const price = Number(form.dailyRate);
    const deposit = Number(form.depositAmount);
    const year =
      form.yearOfManufacture === "" ? undefined : Number(form.yearOfManufacture);

    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên thiết bị.";
    if (!form.brand.trim()) nextErrors.brand = "Vui lòng nhập thương hiệu.";
    if (!form.category) nextErrors.category = "Vui lòng chọn danh mục.";
    if (!form.condition) nextErrors.condition = "Vui lòng chọn tình trạng.";
    if (!form.description.trim())
      nextErrors.description = "Vui lòng nhập mô tả.";
    if (!Number.isFinite(price) || price <= 0)
      nextErrors.dailyRate = "Giá thuê phải lớn hơn 0.";
    if (!Number.isFinite(deposit) || deposit < 0)
      nextErrors.depositAmount = "Tiền đặt cọc không hợp lệ.";
    if (
      year !== undefined &&
      (!Number.isInteger(year) ||
        year < 1990 ||
        year > new Date().getFullYear())
    ) {
      nextErrors.yearOfManufacture = "Vui lòng nhập năm sản xuất hợp lệ.";
    }
    if (!form.addressText.trim())
      nextErrors.addressText = "Vui lòng nhập địa chỉ thiết bị.";
    if (images.length === 0)
      nextErrors.images = "Thiết bị cần có ít nhất 1 ảnh.";
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      nextErrors.latitude = "Vĩ độ phải trong khoảng -90 đến 90.";
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      nextErrors.longitude = "Kinh độ phải trong khoảng -180 đến 180.";

    let specs;
    try {
      specs = JSON.parse(form.specs || "{}");
      if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
        throw new Error("Thông số phải có dạng object JSON.");
      }
    } catch {
      nextErrors.specs = "Thông số kỹ thuật phải là JSON object hợp lệ.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError("");
    try {
      const imageUrls = [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (image.file) {
          setUploadMessage(`Đang tải ảnh ${index + 1}/${images.length}...`);
          const compressedImage = await compressImage(image.file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.85,
            mimeType: "image/webp",
          });
          if (compressedImage.size > 3 * 1024 * 1024) {
            throw new Error(
              `Ảnh ${index + 1} vẫn quá lớn sau khi nén. Vui lòng chọn ảnh khác.`,
            );
          }
          const uploadedImage = await uploadToCloudinaryDirect(compressedImage, {
            folder: "techshare/devices",
          });
          imageUrls.push(uploadedImage.url);
        } else {
          imageUrls.push(image.url);
        }
      }

      setUploadMessage("Đang lưu thay đổi thiết bị...");
      await updateOwnerDevice(deviceId, {
        name: form.name.trim(),
        title: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        ...(year === undefined ? {} : { yearOfManufacture: year }),
        condition: form.condition,
        description: form.description.trim(),
        dailyRate: price,
        depositAmount: deposit,
        addressText: form.addressText.trim(),
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
          addressText: form.addressText.trim(),
        },
        specs,
        images: imageUrls,
      });
      navigate(ROUTES.OWNER_DEVICES);
    } catch (saveError) {
      setError(saveError.message || "Không thể cập nhật thiết bị.");
    } finally {
      setUploadMessage("");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="edit-device-page" aria-live="polite">
        <div className="edit-device-state">
          <LoaderCircle className="edit-device-spinner" size={24} />
          <span>Đang tải thông tin thiết bị...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-device-page">
      <div className="edit-device-container">
        <button
          className="edit-device-back"
          type="button"
          onClick={() => navigate(ROUTES.OWNER_DEVICES)}
        >
          <ArrowLeft size={17} />
          Quay lại kho thiết bị
        </button>

        <header className="edit-device-heading">
          <span>OWNER DASHBOARD</span>
          <h1>Cập nhật thiết bị</h1>
          <p>Chỉnh sửa thông tin thiết bị cho thuê của bạn.</p>
        </header>

        {error && (
          <p className="edit-device-error" role="alert">
            {error}
          </p>
        )}

        {deviceLoaded && (
          <form className="edit-device-form" onSubmit={handleSubmit}>
            <section className="edit-device-images">
              <div className="edit-device-images-heading">
                <div>
                  <h2>Ảnh thiết bị</h2>
                  <small>{images.length}/8 ảnh · JPG, PNG hoặc WEBP, tối đa 10MB mỗi ảnh</small>
                </div>
                {images.length < 8 && (
                  <button
                    type="button"
                    className="edit-device-add-image"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus size={16} />
                    Thêm ảnh
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  className="edit-device-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelection}
                />
              </div>
              <div className="edit-device-image-grid">
                {images.map((image, index) => (
                  <div className="edit-device-image-item" key={image.previewUrl || `${image.url}-${index}`}>
                    <img
                      src={image.previewUrl || image.url}
                      alt={`Ảnh thiết bị ${index + 1}`}
                    />
                    {image.file && (
                      <span className="edit-device-new-image">Ảnh mới</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Xóa ảnh ${index + 1}`}
                      title="Xóa ảnh khỏi thiết bị"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {images.length === 0 && (
                  <p className="edit-device-no-images">Chưa có ảnh. Hãy thêm ít nhất một ảnh.</p>
                )}
              </div>
              {imageError && (
                <small className="edit-device-image-error" role="alert">
                  {imageError}
                </small>
              )}
              {fieldErrors.images && (
                <small className="edit-device-image-error" role="alert">
                  {fieldErrors.images}
                </small>
              )}
            </section>

            <div className="edit-device-fields">
              <label>
                Tên thiết bị *
                <input name="name" value={form.name} onChange={handleChange} />
                {fieldErrors.name && <small>{fieldErrors.name}</small>}
              </label>
              <label>
                Thương hiệu *
                <input name="brand" value={form.brand} onChange={handleChange} />
                {fieldErrors.brand && <small>{fieldErrors.brand}</small>}
              </label>
              <label>
                Danh mục *
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {fieldErrors.category && <small>{fieldErrors.category}</small>}
              </label>
              <label>
                Tình trạng *
                <select
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                >
                  <option value="">Chọn tình trạng</option>
                  {conditions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {fieldErrors.condition && <small>{fieldErrors.condition}</small>}
              </label>
              <label>
                Năm sản xuất
                <input
                  name="yearOfManufacture"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={form.yearOfManufacture}
                  onChange={handleChange}
                />
                {fieldErrors.yearOfManufacture && (
                  <small>{fieldErrors.yearOfManufacture}</small>
                )}
              </label>
              <label>
                Giá thuê mỗi ngày (VND) *
                <input
                  name="dailyRate"
                  type="number"
                  min="1"
                  value={form.dailyRate}
                  onChange={handleChange}
                />
                {fieldErrors.dailyRate && <small>{fieldErrors.dailyRate}</small>}
              </label>
              <label>
                Tiền đặt cọc (VND) *
                <input
                  name="depositAmount"
                  type="number"
                  min="0"
                  value={form.depositAmount}
                  onChange={handleChange}
                />
                {fieldErrors.depositAmount && (
                  <small>{fieldErrors.depositAmount}</small>
                )}
              </label>
              <label className="edit-device-wide">
                Địa chỉ thiết bị *
                <input
                  name="addressText"
                  value={form.addressText}
                  onChange={handleChange}
                />
                {fieldErrors.addressText && <small>{fieldErrors.addressText}</small>}
              </label>
              <label>
                Vĩ độ *
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={handleChange}
                />
                {fieldErrors.latitude && <small>{fieldErrors.latitude}</small>}
              </label>
              <label>
                Kinh độ *
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={handleChange}
                />
                {fieldErrors.longitude && <small>{fieldErrors.longitude}</small>}
              </label>
              <label className="edit-device-wide">
                Mô tả *
                <textarea
                  name="description"
                  rows="5"
                  value={form.description}
                  onChange={handleChange}
                />
                {fieldErrors.description && <small>{fieldErrors.description}</small>}
              </label>
              <label className="edit-device-wide">
                Thông số kỹ thuật (JSON)
                <textarea
                  className="edit-device-specs"
                  name="specs"
                  rows="6"
                  value={form.specs}
                  onChange={handleChange}
                  spellCheck="false"
                />
                {fieldErrors.specs && <small>{fieldErrors.specs}</small>}
              </label>
            </div>

            {uploadMessage && (
              <p className="edit-device-upload-message" role="status">
                <LoaderCircle className="edit-device-spinner" size={16} />
                {uploadMessage}
              </p>
            )}

            <div className="edit-device-actions">
              <button
                type="button"
                className="edit-device-cancel"
                onClick={() => navigate(ROUTES.OWNER_DEVICES)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="edit-device-save"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle className="edit-device-spinner" size={17} />
                ) : (
                  <Save size={17} />
                )}
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default EditDevicePage;

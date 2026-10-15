import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  PackagePlus,
  X,
} from "lucide-react";
import BasicDeviceForm from "../components/device/BasicDeviceForm";
import RentalInfoForm from "../components/device/RentalInfoForm";
import SpecsBuilderForm from "../components/device/SpecsBuilderForm";
import api from "../services/api.js";
import { compressImage } from "../services/uploadService.js";
import "./PostDevicePage.css";

const steps = [
  { title: "Thông tin cơ bản", description: "Giới thiệu thiết bị" },
  { title: "Thông tin cho thuê", description: "Giá và địa điểm" },
  { title: "Thông số kỹ thuật", description: "Chi tiết thiết bị" },
];

const convertBlobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.readAsDataURL(blob);
  });

const PostDevicePage = ({ onBack, onDeviceCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    name: "",
    category: "",
    brand: "",
    yearOfManufacture: "",
    condition: "",
    description: "",
    images: [],
    pricePerDay: "",
    depositAmount: "",
    addressText: "",
    specs: [],
  });
  const [errors, setErrors] = useState({});
  const [showSpecValidation, setShowSpecValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [submissionModal, setSubmissionModal] = useState(null);

  const handleChange = (name, value) => {
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));
    setSubmissionModal(null);
  };

  const handleAddImages = (selectedImages) => {
    const validImages = selectedImages.filter(
      (image) =>
        ["image/jpeg", "image/png", "image/webp"].includes(image.type) &&
        image.size <= 10 * 1024 * 1024,
    );
    const remainingSlots = 3 - formData.images.length;
    const imagesToAdd = validImages.slice(0, remainingSlots);

    setFormData((previousData) => ({
      ...previousData,
      images: [...previousData.images, ...imagesToAdd],
    }));

    let imageError = "";
    if (validImages.length !== selectedImages.length) {
      imageError = "Chỉ hỗ trợ ảnh JPG, PNG, WEBP có dung lượng tối đa 10MB.";
    } else if (validImages.length > remainingSlots) {
      imageError = "Bạn chỉ có thể chọn tối đa 3 ảnh.";
    }

    setErrors((previousErrors) => ({
      ...previousErrors,
      images: imageError,
      imageUpload: "",
    }));
  };

  const handleRemoveImage = (imageIndex) => {
    setFormData((previousData) => ({
      ...previousData,
      images: previousData.images.filter(
        (image, index) => index !== imageIndex,
      ),
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      images: "",
    }));
  };

  const validateCurrentStep = () => {
    const nextErrors = {};

    if (currentStep === 1) {
       if (!formData.title.trim())
        nextErrors.title = "Vui lòng nhập tiêu đề.";
      if (!formData.name.trim())
        nextErrors.name = "Vui lòng nhập tên thiết bị.";
      if (!formData.category) nextErrors.category = "Vui lòng chọn danh mục.";
      if (!formData.brand.trim())
        nextErrors.brand = "Vui lòng nhập thương hiệu.";
      if (!formData.description.trim())
        nextErrors.description = "Vui lòng nhập mô tả thiết bị.";
      if (formData.images.length < 2) {
        nextErrors.images = "Vui lòng thêm ít nhất 2 ảnh thiết bị.";
      }

      const year = Number(formData.yearOfManufacture);
      if (!formData.yearOfManufacture) {
        nextErrors.yearOfManufacture = "Vui lòng nhập năm sản xuất.";
      } else if (
        !Number.isInteger(year) ||
        year < 1990 ||
        year > new Date().getFullYear()
      ) {
        nextErrors.yearOfManufacture =
          "Năm sản xuất phải từ 1990 đến hiện tại.";
      }

      if (!formData.condition)
        nextErrors.condition = "Vui lòng chọn tình trạng thiết bị.";
    }

    if (currentStep === 2) {
      if (!formData.pricePerDay) {
        nextErrors.pricePerDay = "Vui lòng nhập giá thuê mỗi ngày.";
      } else if (Number(formData.pricePerDay) <= 0) {
        nextErrors.pricePerDay = "Giá thuê phải lớn hơn 0.";
      }

      if (formData.depositAmount === "") {
        nextErrors.depositAmount = "Vui lòng nhập tiền đặt cọc.";
      } else if (Number(formData.depositAmount) < 0) {
        nextErrors.depositAmount = "Tiền đặt cọc không được âm.";
      }

      if (!formData.addressText.trim()) {
        nextErrors.addressText = "Vui lòng nhập địa chỉ thiết bị.";
      }
    }

    if (currentStep === 3) {
      setShowSpecValidation(true);
      const hasEmptyName = formData.specs.some(
        (specification) => !specification.key.trim(),
      );
      const hasDuplicateName = formData.specs.some((specification, index) =>
        formData.specs.some(
          (otherSpecification, otherIndex) =>
            index !== otherIndex &&
            specification.key.trim().toLowerCase() ===
              otherSpecification.key.trim().toLowerCase(),
        ),
      );

      if (hasEmptyName)
        nextErrors.specs = "Vui lòng nhập tên cho mỗi thông số.";
      if (hasDuplicateName)
        nextErrors.specs = "Tên thông số không được trùng nhau.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((step) => Math.min(step + 1, steps.length));
      setSubmissionModal(null);
    }
  };

  const handleBack = () => {
    setErrors({});
    setSubmissionModal(null);

    if (currentStep === 1) {
      onBack();
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleSubmit = async () => {
    if (isSubmitting || submissionModal?.isSuccess || !validateCurrentStep())
      return;

    setIsSubmitting(true);

    const token = localStorage.getItem("techshare_token");
    if (!token) {
      setSubmissionModal({
        title: "Bạn chưa đăng nhập",
        message:
          "Vui lòng đăng nhập bằng tài khoản chủ thiết bị rồi thử đăng thiết bị lại.",
        isSuccess: false,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const imageData = [];
      for (let index = 0; index < formData.images.length; index += 1) {
        setUploadMessage(
          `Đang chuẩn bị ảnh ${index + 1}/${formData.images.length}...`,
        );
        const compressedImage = await compressImage(formData.images[index], {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
        if (compressedImage.size > 3 * 1024 * 1024) {
          throw new Error(
            `Ảnh ${index + 1} vẫn quá lớn sau khi nén. Vui lòng chọn ảnh khác.`,
          );
        }
        imageData.push(await convertBlobToDataUrl(compressedImage));
      }

      const specifications = formData.specs.reduce((result, specification) => {
        const name = specification.key.trim();
        if (name) result[name] = specification.value.trim();
        return result;
      }, {});

      setUploadMessage("Đang tải ảnh lên và lưu thông tin thiết bị...");
      const response = await api.post(
        "/devices",
        {
          title: formData.title.trim(),
          name: formData.name.trim(),
          category: formData.category,
          brand: formData.brand.trim(),
          yearOfManufacture: Number(formData.yearOfManufacture),
          condition: formData.condition,
          description: formData.description.trim(),
          pricePerDay: Number(formData.pricePerDay),
          depositAmount: Number(formData.depositAmount),
          addressText: formData.addressText.trim(),
          specs: specifications,
          images: imageData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Máy chủ chưa xác nhận thiết bị đã được tạo.",
        );
      }

      onDeviceCreated(response.data);
      setSubmissionModal({
        title: "Đăng thiết bị thành công",
        message: "Thiết bị và ảnh đã được lưu vào kho thiết bị.",
        isSuccess: true,
      });
    } catch (error) {
      setSubmissionModal({
        title: "Không thể đăng thiết bị",
        message: error.message || "Đã có lỗi xảy ra. Vui lòng thử lại.",
        isSuccess: false,
      });
    } finally {
      setUploadMessage("");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="post-device-page">
      <div className="post-device-page-inner">
        <button
          type="button"
          className="post-device-back-link"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          <span>Quay lại kho thiết bị</span>
        </button>

        <div className="post-device-page-heading">
          <div className="post-device-heading-icon">
            <PackagePlus size={23} />
          </div>
          <div>
            <h1>Đăng thiết bị cho thuê</h1>
            <p>
              Hoàn thành các thông tin bên dưới để giới thiệu thiết bị của bạn.
            </p>
          </div>
        </div>

        <nav
          className="post-device-progress"
          aria-label="Tiến trình đăng thiết bị"
        >
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;

            return (
              <div
                className={`post-device-progress-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}
                key={step.title}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="post-device-step-number">
                  {isComplete ? <Check size={15} /> : stepNumber}
                </span>
                <span className="post-device-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
                {index < steps.length - 1 && (
                  <span className="post-device-step-line" />
                )}
              </div>
            );
          })}
        </nav>

        <div className="post-device-card">
          <div className="post-device-card-heading">
            <span>
              BƯỚC {currentStep} / {steps.length}
            </span>
            <h2>{steps[currentStep - 1].title}</h2>
          </div>

          <div className="post-device-step-content" key={currentStep}>
            {currentStep === 1 && (
              <BasicDeviceForm
                values={formData}
                errors={errors}
                onChange={handleChange}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
              />
            )}
            {currentStep === 2 && (
              <RentalInfoForm
                values={formData}
                errors={errors}
                onChange={handleChange}
              />
            )}
            {currentStep === 3 && (
              <>
                <SpecsBuilderForm
                  specifications={formData.specs}
                  showValidation={showSpecValidation}
                  onChange={(specs) => handleChange("specs", specs)}
                />
                {errors.specs && (
                  <p className="post-device-error post-device-specs-error">
                    {errors.specs}
                  </p>
                )}
              </>
            )}
          </div>

          {uploadMessage && (
            <p className="post-device-upload-message" role="status">
              {uploadMessage}
            </p>
          )}

          <div className="post-device-form-actions">
            <button
              type="button"
              className="post-device-secondary-button"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft size={17} />
              <span>{currentStep === 1 ? "Hủy" : "Quay lại"}</span>
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                className="post-device-primary-button"
                onClick={handleNext}
              >
                <span>Tiếp tục</span>
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                className="post-device-primary-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="post-device-spinner" size={17} />
                ) : (
                  <Check size={17} />
                )}
                <span>{isSubmitting ? "Đang gửi..." : "Gửi thiết bị"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {submissionModal && (
        <div className="post-device-modal-overlay" role="presentation">
          <div
            className="post-device-result-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-device-result-title"
          >
            <button
              type="button"
              className="post-device-modal-close"
              onClick={() => setSubmissionModal(null)}
              aria-label="Đóng thông báo"
            >
              <X size={19} />
            </button>
            <div
              className={`post-device-modal-icon ${submissionModal.isSuccess ? "success" : "error"}`}
            >
              {submissionModal.isSuccess ? (
                <Check size={23} />
              ) : (
                <X size={23} />
              )}
            </div>
            <h2 id="post-device-result-title">{submissionModal.title}</h2>
            <p>{submissionModal.message}</p>
            <button
              type="button"
              className="post-device-primary-button"
              onClick={() =>
                submissionModal.isSuccess ? onBack() : setSubmissionModal(null)
              }
            >
              {submissionModal.isSuccess ? "Về kho thiết bị" : "Đã hiểu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDevicePage;

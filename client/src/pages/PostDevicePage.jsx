import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, PackagePlus, X } from 'lucide-react';
import BasicDeviceForm from '../components/device/BasicDeviceForm';
import RentalInfoForm from '../components/device/RentalInfoForm';
import SpecsBuilderForm from '../components/device/SpecsBuilderForm';
import './PostDevicePage.css';

const steps = [
  { title: 'Thông tin cơ bản', description: 'Giới thiệu thiết bị' },
  { title: 'Thông tin cho thuê', description: 'Giá và địa điểm' },
  { title: 'Thông số kỹ thuật', description: 'Chi tiết thiết bị' },
];

const PostDevicePage = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    yearOfManufacture: '',
    condition: '',
    description: '',
    pricePerDay: '',
    depositAmount: '',
    addressText: '',
    specs: [],
  });
  const [errors, setErrors] = useState({});
  const [showSpecValidation, setShowSpecValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionModal, setSubmissionModal] = useState(null);

  const handleChange = (name, value) => {
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: '',
    }));
    setSubmissionModal(null);
  };

  const validateCurrentStep = () => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) nextErrors.name = 'Vui lòng nhập tên thiết bị.';
      if (!formData.category) nextErrors.category = 'Vui lòng chọn danh mục.';
      if (!formData.brand.trim()) nextErrors.brand = 'Vui lòng nhập thương hiệu.';
      if (!formData.description.trim()) nextErrors.description = 'Vui lòng nhập mô tả thiết bị.';

      if (formData.yearOfManufacture) {
        const year = Number(formData.yearOfManufacture);
        if (year < 1900 || year > new Date().getFullYear()) {
          nextErrors.yearOfManufacture = 'Vui lòng nhập năm hợp lệ.';
        }
      }
    }

    if (currentStep === 2) {
      if (!formData.pricePerDay) {
        nextErrors.pricePerDay = 'Vui lòng nhập giá thuê mỗi ngày.';
      } else if (Number(formData.pricePerDay) <= 0) {
        nextErrors.pricePerDay = 'Giá thuê phải lớn hơn 0.';
      }

      if (formData.depositAmount === '') {
        nextErrors.depositAmount = 'Vui lòng nhập tiền đặt cọc.';
      } else if (Number(formData.depositAmount) < 0) {
        nextErrors.depositAmount = 'Tiền đặt cọc không được âm.';
      }

      if (!formData.addressText.trim()) {
        nextErrors.addressText = 'Vui lòng nhập địa chỉ thiết bị.';
      }
    }

    if (currentStep === 3) {
      setShowSpecValidation(true);
      const hasEmptyName = formData.specs.some((specification) => !specification.key.trim());
      const hasDuplicateName = formData.specs.some((specification, index) =>
        formData.specs.some((otherSpecification, otherIndex) =>
          index !== otherIndex &&
          specification.key.trim().toLowerCase() === otherSpecification.key.trim().toLowerCase()
        )
      );

      if (hasEmptyName) nextErrors.specs = 'Vui lòng nhập tên cho mỗi thông số.';
      if (hasDuplicateName) nextErrors.specs = 'Tên thông số không được trùng nhau.';
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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting || !validateCurrentStep()) return;

    setIsSubmitting(true);

    // TODO: Gọi API tạo thiết bị sau khi backend bổ sung endpoint POST đã xác thực.
    window.requestAnimationFrame(() => {
      setSubmissionModal({
        title: 'Chưa thể đăng thiết bị',
        message: 'Thông tin đã hợp lệ nhưng backend hiện chưa có API tạo thiết bị nên chưa được lưu.',
        isSuccess: false,
      });
      setIsSubmitting(false);
    });
  };

  return (
    <div className="post-device-page">
      <div className="post-device-page-inner">
        <button type="button" className="post-device-back-link" onClick={onBack}>
          <ArrowLeft size={17} />
          <span>Quay lại kho thiết bị</span>
        </button>

        <div className="post-device-page-heading">
          <div className="post-device-heading-icon"><PackagePlus size={23} /></div>
          <div>
            <h1>Đăng thiết bị cho thuê</h1>
            <p>Hoàn thành các thông tin bên dưới để giới thiệu thiết bị của bạn.</p>
          </div>
        </div>

        <nav className="post-device-progress" aria-label="Tiến trình đăng thiết bị">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;

            return (
              <div
                className={`post-device-progress-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                key={step.title}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="post-device-step-number">
                  {isComplete ? <Check size={15} /> : stepNumber}
                </span>
                <span className="post-device-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
                {index < steps.length - 1 && <span className="post-device-step-line" />}
              </div>
            );
          })}
        </nav>

        <form className="post-device-card" onSubmit={handleSubmit} noValidate>
          <div className="post-device-card-heading">
            <span>BƯỚC {currentStep} / {steps.length}</span>
            <h2>{steps[currentStep - 1].title}</h2>
          </div>

          <div className="post-device-step-content" key={currentStep}>
            {currentStep === 1 && (
              <BasicDeviceForm
                values={formData}
                errors={errors}
                onChange={handleChange}
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
                  onChange={(specs) => handleChange('specs', specs)}
                />
                {errors.specs && <p className="post-device-error post-device-specs-error">{errors.specs}</p>}
              </>
            )}
          </div>

          <div className="post-device-form-actions">
            <button
              type="button"
              className="post-device-secondary-button"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft size={17} />
              <span>{currentStep === 1 ? 'Hủy' : 'Quay lại'}</span>
            </button>

            {currentStep < steps.length ? (
              <button type="button" className="post-device-primary-button" onClick={handleNext}>
                <span>Tiếp tục</span>
                <ArrowRight size={17} />
              </button>
            ) : (
              <button type="submit" className="post-device-primary-button" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="post-device-spinner" size={17} /> : <Check size={17} />}
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi thiết bị'}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {submissionModal && (
        <div className="post-device-modal-overlay" role="presentation">
          <div className="post-device-result-modal" role="dialog" aria-modal="true" aria-labelledby="post-device-result-title">
            <button
              type="button"
              className="post-device-modal-close"
              onClick={() => setSubmissionModal(null)}
              aria-label="Đóng thông báo"
            >
              <X size={19} />
            </button>
            <div className={`post-device-modal-icon ${submissionModal.isSuccess ? 'success' : 'error'}`}>
              {submissionModal.isSuccess ? <Check size={23} /> : <X size={23} />}
            </div>
            <h2 id="post-device-result-title">{submissionModal.title}</h2>
            <p>{submissionModal.message}</p>
            <button type="button" className="post-device-primary-button" onClick={() => setSubmissionModal(null)}>
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDevicePage;

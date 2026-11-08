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
import { generateDeviceDescription } from "../services/aiDeviceService.js";
import { compressImage } from "../services/uploadService.js";
import "./PostDevicePage.css";

const steps = [
  { title: "Basic Information", description: "Introduce your device" },
  { title: "Rental Information", description: "Set your price and location" },
  { title: "Technical Specifications", description: "Device details" },
];

const convertBlobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
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
    latitude: "",
    longitude: "",
    specs: [],
  });
  const [errors, setErrors] = useState({});
  const [showSpecValidation, setShowSpecValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [submissionModal, setSubmissionModal] = useState(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenerationError, setDescriptionGenerationError] =
    useState("");

  const handleChange = (name, value) => {
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      ...(name === "latitude" || name === "longitude" ? { location: "" } : {}),
    }));
    if (
      [
        "name",
        "brand",
        "category",
        "yearOfManufacture",
        "condition",
        "pricePerDay",
      ].includes(name)
    ) {
      setDescriptionGenerationError("");
    }
    setSubmissionModal(null);
  };

  const handleGenerateDescription = async () => {
    if (isGeneratingDescription) return;

    setIsGeneratingDescription(true);
    setDescriptionGenerationError("");
    try {
      const description = await generateDeviceDescription({
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        yearOfManufacture: formData.yearOfManufacture,
        condition: formData.condition,
        pricePerDay: formData.pricePerDay
          ? Number(formData.pricePerDay)
          : undefined,
        specs: formData.specs.reduce((result, specification) => {
          const name = specification.key.trim();
          if (name && specification.value.trim()) {
            result[name] = specification.value.trim();
          }
          return result;
        }, {}),
      });

      setFormData((previousData) => ({ ...previousData, description }));
      setErrors((previousErrors) => ({
        ...previousErrors,
        description: "",
      }));
    } catch (error) {
      setDescriptionGenerationError(
        error.message || "Unable to generate a description right now. Please try again.",
      );
    } finally {
      setIsGeneratingDescription(false);
    }
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
      imageError = "Only JPG, PNG, and WEBP images up to 10 MB are supported.";
    } else if (validImages.length > remainingSlots) {
      imageError = "You can select up to 3 images.";
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
      if (!formData.title.trim()) nextErrors.title = "Please enter a listing title.";
      if (!formData.name.trim())
        nextErrors.name = "Please enter a device name.";
      if (!formData.category) nextErrors.category = "Please select a category.";
      if (!formData.brand.trim())
        nextErrors.brand = "Please enter a brand.";
      if (formData.images.length < 2) {
        nextErrors.images = "Please add at least 2 device photos.";
      }

      const year = Number(formData.yearOfManufacture);
      if (!formData.yearOfManufacture) {
        nextErrors.yearOfManufacture = "Please enter the year of manufacture.";
      } else if (
        !Number.isInteger(year) ||
        year < 1990 ||
        year > new Date().getFullYear()
      ) {
        nextErrors.yearOfManufacture =
          "The year of manufacture must be between 1990 and the current year.";
      }

      if (!formData.condition)
        nextErrors.condition = "Please select the device condition.";
    }

    if (currentStep === 2) {
      if (!formData.pricePerDay) {
        nextErrors.pricePerDay = "Please enter the daily rental price.";
      } else if (Number(formData.pricePerDay) <= 0) {
        nextErrors.pricePerDay = "The rental price must be greater than 0.";
      }

      if (formData.depositAmount === "") {
        nextErrors.depositAmount = "Please enter the security deposit.";
      } else if (Number(formData.depositAmount) < 0) {
        nextErrors.depositAmount = "The security deposit cannot be negative.";
      }

      if (!formData.addressText.trim()) {
        nextErrors.addressText = "Please enter the device location address.";
      }

      const latitude = Number(formData.latitude);
      const longitude = Number(formData.longitude);
      if (
        formData.latitude === "" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        nextErrors.latitude = "Please enter a valid latitude between -90 and 90.";
      }
      if (
        formData.longitude === "" ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        nextErrors.longitude = "Please enter a valid longitude between -180 and 180.";
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
        nextErrors.specs = "Please enter a name for each specification.";
      if (hasDuplicateName)
        nextErrors.specs = "Specification names must be unique.";
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

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        location: "Your browser does not support location access.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFormData((previousData) => ({
          ...previousData,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        }));
        setErrors((previousErrors) => ({
          ...previousErrors,
          latitude: "",
          longitude: "",
          location: "",
        }));
      },
      (error) => {
        const messages = {
          1: "Allow location access in your browser to use this feature.",
          2: "Unable to determine your location. Please try again or enter the coordinates manually.",
          3: "The location request timed out. Please try again.",
        };
        setErrors((previousErrors) => ({
          ...previousErrors,
          location: messages[error.code] || "Unable to get your current location.",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting || submissionModal?.isSuccess || !validateCurrentStep())
      return;

    setIsSubmitting(true);

    const token = localStorage.getItem("techshare_token");
    if (!token) {
      setSubmissionModal({
        title: "You are not signed in",
        message: "Please sign in with an equipment owner account and try listing your device again.",
        isSuccess: false,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const imageData = [];
      for (let index = 0; index < formData.images.length; index += 1) {
        setUploadMessage(
          `Preparing image ${index + 1} of ${formData.images.length}...`,
        );
        const compressedImage = await compressImage(formData.images[index], {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
        if (compressedImage.size > 3 * 1024 * 1024) {
          throw new Error(
            `Image ${index + 1} is still too large after compression. Please choose another image.`,
          );
        }
        imageData.push(await convertBlobToDataUrl(compressedImage));
      }

      const specifications = formData.specs.reduce((result, specification) => {
        const name = specification.key.trim();
        if (name) result[name] = specification.value.trim();
        return result;
      }, {});

      setUploadMessage("Uploading images and saving device details...");
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
          location: {
            type: "Point",
            coordinates: [
              Number(formData.longitude),
              Number(formData.latitude),
            ],
            addressText: formData.addressText.trim(),
          },
          specs: specifications,
          images: imageData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "The server did not confirm that the device was created.",
        );
      }

      onDeviceCreated(response.data);
      setSubmissionModal({
        title: "Device Listed Successfully",
        message: "Your listing is awaiting admin review before it becomes visible on the marketplace.",
        isSuccess: true,
      });
    } catch (error) {
      setSubmissionModal({
        title: "Unable to List Device",
        message: error.message || "Something went wrong. Please try again.",
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
          <span>Back to My Devices</span>
        </button>

        <div className="post-device-page-heading">
          <div className="post-device-heading-icon">
            <PackagePlus size={23} />
          </div>
          <div>
            <h1>List a Device for Rent</h1>
            <p>
              Complete the details below to list your device for rent.
            </p>
          </div>
        </div>

        <nav
          className="post-device-progress"
          aria-label="Device listing progress"
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
              STEP {currentStep} OF {steps.length}
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
                onGenerateDescription={handleGenerateDescription}
                canGenerateDescription={
                  Boolean(formData.name.trim()) &&
                  Boolean(formData.category) &&
                  Boolean(formData.brand.trim()) &&
                  Number.isInteger(Number(formData.yearOfManufacture)) &&
                  Number(formData.yearOfManufacture) >= 1990 &&
                  Number(formData.yearOfManufacture) <=
                    new Date().getFullYear() &&
                  Boolean(formData.condition)
                }
                isGeneratingDescription={isGeneratingDescription}
                descriptionGenerationError={descriptionGenerationError}
              />
            )}
            {currentStep === 2 && (
              <RentalInfoForm
                values={formData}
                errors={errors}
                onChange={handleChange}
                onGetCurrentLocation={handleGetCurrentLocation}
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
              <span>{currentStep === 1 ? "Cancel" : "Back"}</span>
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                className="post-device-primary-button"
                onClick={handleNext}
              >
                <span>Continue</span>
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
                <span>{isSubmitting ? "Submitting..." : "Submit Listing"}</span>
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
              aria-label="Close notification"
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
              {submissionModal.isSuccess ? "Back to My Devices" : "Got It"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDevicePage;

import React, { useState, useEffect } from 'react';
import {
  Crown,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Camera,
  Loader2,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { uploadEkycImage } from '../../services/uploadService.js';
import { getMyOwnerEkycStatus, submitOwnerEkyc } from '../../services/ownerEkycService.js';
import './OwnerEkycSubmitModal.css';

/**
 * Modal for Renter to Owner upgrade eKYC verification
 * Requirements:
 * 1. Must have completed renter verification (2-sided ID card)
 * 2. Requires 3 photos:
 *    - Front of ID Card
 *    - Back of ID Card
 *    - Portrait / Selfie holding ID Card
 */
export const OwnerEkycSubmitModal = ({
  isOpen,
  onClose,
  user = {},
  account = {},
  onSuccess,
  onOpenEditAddress,
}) => {
  // Photo 1: Front of ID
  const [frontImage, setFrontImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [frontProgress, setFrontProgress] = useState(0);
  const [uploadingFront, setUploadingFront] = useState(false);

  // Photo 2: Back of ID
  const [backImage, setBackImage] = useState(null);
  const [backPreview, setBackPreview] = useState('');
  const [backProgress, setBackProgress] = useState(0);
  const [uploadingBack, setUploadingBack] = useState(false);

  // Photo 3: Selfie holding ID
  const [holdingImage, setHoldingImage] = useState(null);
  const [holdingPreview, setHoldingPreview] = useState('');
  const [holdingProgress, setHoldingProgress] = useState(0);
  const [uploadingHolding, setUploadingHolding] = useState(false);

  const [idCardNumber, setIdCardNumber] = useState('');

  // Status from server
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusData, setStatusData] = useState(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Read-only user details
  const displayName = user?.name || '';
  const displayEmail = user?.email || account?.email || '';
  const displayPhone = user?.phone || '';
  const displayAddress = (user?.address || '').trim();
  const hasAddress = Boolean(displayAddress && displayAddress.length > 0);

  // Fetch status on modal open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');

    const fetchStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await getMyOwnerEkycStatus();
        if (res?.success && res?.data) {
          setStatusData(res.data);
          const reqData = res.data.request;
          if (reqData) {
            if (reqData.idCardFrontUrl) setFrontPreview(reqData.idCardFrontUrl);
            if (reqData.idCardBackUrl) setBackPreview(reqData.idCardBackUrl);
            if (reqData.idCardHoldingUrl) setHoldingPreview(reqData.idCardHoldingUrl);
            if (reqData.idCardNumber) setIdCardNumber(reqData.idCardNumber);
          } else if (res.data.renterEkyc) {
            // Suggest previous ID number if available
            if (res.data.renterEkyc.idCardNumber) {
              setIdCardNumber(res.data.renterEkyc.idCardNumber);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching Owner eKYC status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  // Quick action: reuse photos from approved renter eKYC
  const handleReuseRenterPhotos = () => {
    if (statusData?.renterEkyc) {
      if (statusData.renterEkyc.idCardFrontUrl) {
        setFrontPreview(statusData.renterEkyc.idCardFrontUrl);
        setFrontImage(statusData.renterEkyc.idCardFrontUrl);
      }
      if (statusData.renterEkyc.idCardBackUrl) {
        setBackPreview(statusData.renterEkyc.idCardBackUrl);
        setBackImage(statusData.renterEkyc.idCardBackUrl);
      }
      if (statusData.renterEkyc.idCardNumber && !idCardNumber) {
        setIdCardNumber(statusData.renterEkyc.idCardNumber);
      }
    }
  };

  // 1. Upload Front of ID
  const handleFrontFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setErrorMsg('');
      setUploadingFront(true);
      setFrontProgress(15);

      const localUrl = URL.createObjectURL(file);
      setFrontPreview(localUrl);

      const res = await uploadEkycImage(file, {
        onProgress: (p) => setFrontProgress(p),
      });

      if (res?.url) {
        setFrontImage(res.url);
        setFrontPreview(res.url);
      }
    } catch (err) {
      console.error('Front upload failed:', err);
      setErrorMsg('Failed to upload front image of ID card. Please try again.');
      setFrontPreview('');
      setFrontImage(null);
    } finally {
      setUploadingFront(false);
      setFrontProgress(0);
    }
  };

  // 2. Upload Back of ID
  const handleBackFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setErrorMsg('');
      setUploadingBack(true);
      setBackProgress(15);

      const localUrl = URL.createObjectURL(file);
      setBackPreview(localUrl);

      const res = await uploadEkycImage(file, {
        onProgress: (p) => setBackProgress(p),
      });

      if (res?.url) {
        setBackImage(res.url);
        setBackPreview(res.url);
      }
    } catch (err) {
      console.error('Back upload failed:', err);
      setErrorMsg('Failed to upload back image of ID card. Please try again.');
      setBackPreview('');
      setBackImage(null);
    } finally {
      setUploadingBack(false);
      setBackProgress(0);
    }
  };

  // 3. Upload Selfie holding ID
  const handleHoldingFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setErrorMsg('');
      setUploadingHolding(true);
      setHoldingProgress(15);

      const localUrl = URL.createObjectURL(file);
      setHoldingPreview(localUrl);

      const res = await uploadEkycImage(file, {
        onProgress: (p) => setHoldingProgress(p),
      });

      if (res?.url) {
        setHoldingImage(res.url);
        setHoldingPreview(res.url);
      }
    } catch (err) {
      console.error('Selfie with ID upload failed:', err);
      setErrorMsg('Failed to upload selfie holding ID card. Please try again.');
      setHoldingPreview('');
      setHoldingImage(null);
    } finally {
      setUploadingHolding(false);
      setHoldingProgress(0);
    }
  };

  // Submit Owner upgrade verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Preconditions
    if (statusData && !statusData.isRenterVerified) {
      setErrorMsg(
        'You must complete basic Renter eKYC verification before applying to become an Owner.'
      );
      return;
    }

    if (!hasAddress) {
      setErrorMsg('Your address is missing. Please update your address before submitting.');
      return;
    }

    const finalFront = frontImage || frontPreview;
    const finalBack = backImage || backPreview;
    const finalHolding = holdingImage || holdingPreview;

    if (!finalFront || !finalBack || !finalHolding) {
      setErrorMsg(
        'Please upload all 3 required photos: Front of ID, Back of ID, and a clear Selfie holding your ID card.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await submitOwnerEkyc({
        idCardFrontUrl: finalFront,
        idCardBackUrl: finalBack,
        idCardHoldingUrl: finalHolding,
        idCardNumber: idCardNumber.trim(),
      });

      if (res?.success) {
        setSuccessMsg(
          res.message ||
            'Owner verification submitted successfully! Administrators will review your request shortly.'
        );
        setStatusData((prev) => ({
          ...prev,
          request: res.data,
        }));

        if (typeof onSuccess === 'function') {
          onSuccess(res.data);
        }

        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res?.message || 'An error occurred while submitting your application.');
      }
    } catch (err) {
      const msg =
        err.data?.message || err.message || 'Unable to submit Owner verification. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = statusData?.request?.status === 'pending';
  const isRejected = statusData?.request?.status === 'rejected';
  const isApproved = statusData?.request?.status === 'approved' || statusData?.isOwner;
  const isRenterVerified = statusData?.isRenterVerified ?? true;

  return (
    <div className="owner-ekyc-modal-backdrop" onClick={onClose}>
      <div className="owner-ekyc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="owner-ekyc-modal-header">
          <div className="owner-ekyc-modal-header-info">
            <div className="owner-ekyc-modal-icon-badge">
              <Crown size={24} />
            </div>
            <div>
              <h2 className="owner-ekyc-modal-title">Upgrade to Device Owner</h2>
              <p className="owner-ekyc-modal-subtitle">
                Advanced identity verification to list and rent out devices on TechShare
              </p>
            </div>
          </div>
          <button
            type="button"
            className="owner-ekyc-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="owner-ekyc-modal-body">
          {/* Feature Introduction Banner - Logo removed */}
          <div className="owner-ekyc-feature-banner">
            <div>
              <h4 className="owner-ekyc-feature-banner-title">
                Owner Privileges & Benefits
              </h4>
              <p className="owner-ekyc-feature-banner-desc">
                Once approved, you can list unlimited tech devices, create rental agreements, and receive rental payouts & security deposits directly to your account. Verification requires <strong>both sides of your ID card</strong> and a <strong>selfie holding your ID card</strong> to ensure asset safety for both parties.
              </p>
            </div>
          </div>

          {/* Alert if not yet verified as Renter */}
          {!isRenterVerified && (
            <div className="owner-ekyc-alert owner-ekyc-alert-error">
              <AlertTriangle size={20} className="flex-shrink-0" />
              <div>
                <strong>Ineligible:</strong> You must complete basic Renter verification (2-sided ID card) before applying to become an Owner.
              </div>
            </div>
          )}

          {/* Alert for pending status */}
          {isPending && (
            <div className="owner-ekyc-alert owner-ekyc-alert-pending">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <strong>Application Pending:</strong> Your Owner verification request is currently under review by our administrators. Review typically takes 15–30 minutes during business hours.
              </div>
            </div>
          )}

          {/* Alert for rejected status */}
          {isRejected && (
            <div className="owner-ekyc-alert owner-ekyc-alert-rejected">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <strong>Application Rejected:</strong>{' '}
                {statusData?.request?.rejectReason || 'Submitted photos did not meet the verification requirements.'}
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                  👉 You can re-upload clearer photos below and resubmit your request.
                </div>
              </div>
            </div>
          )}

          {/* Alert if already Owner */}
          {isApproved && (
            <div className="owner-ekyc-alert owner-ekyc-alert-success">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div>
                <strong>Owner Verified:</strong> Your account has been granted Owner privileges. You can now access Device Management to start listing your devices.
              </div>
            </div>
          )}

          {/* Error / Success Feedback Alerts */}
          {errorMsg && (
            <div className="owner-ekyc-alert owner-ekyc-alert-error">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="owner-ekyc-alert owner-ekyc-alert-success">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Account Holder Information (Read-only) */}
          <div>
            <h3 className="owner-ekyc-section-title">
              <User size={18} color="#286e74" />
              Account Holder Information (Profile)
            </h3>
            <div className="owner-ekyc-profile-grid">
              <div className="owner-ekyc-profile-item">
                <span className="owner-ekyc-profile-label">
                  <User size={13} /> Full Name
                </span>
                <span className="owner-ekyc-profile-val">{displayName || 'Not updated'}</span>
              </div>
              <div className="owner-ekyc-profile-item">
                <span className="owner-ekyc-profile-label">
                  <Mail size={13} /> Email Address
                </span>
                <span className="owner-ekyc-profile-val">{displayEmail || 'Not updated'}</span>
              </div>
              <div className="owner-ekyc-profile-item">
                <span className="owner-ekyc-profile-label">
                  <Phone size={13} /> Phone Number
                </span>
                <span className="owner-ekyc-profile-val">{displayPhone || 'Not updated'}</span>
              </div>
              <div className="owner-ekyc-profile-item">
                <span className="owner-ekyc-profile-label">
                  <MapPin size={13} /> Handover Address
                </span>
                <span className="owner-ekyc-profile-val">
                  {hasAddress ? (
                    displayAddress
                  ) : (
                    <span style={{ color: '#ef4444' }}>
                      No address set.{' '}
                      <button
                        type="button"
                        onClick={onOpenEditAddress}
                        style={{
                          color: '#0284c7',
                          textDecoration: 'underline',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Update now
                      </button>
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Reusable CTA for using previous renter eKYC photos */}
          {statusData?.renterEkyc && !frontPreview && !backPreview && (
            <div className="owner-ekyc-reuse-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} />
                <span>You already have verified 2-sided ID card photos from your Renter verification.</span>
              </div>
              <button
                type="button"
                className="owner-ekyc-reuse-btn"
                onClick={handleReuseRenterPhotos}
              >
                Reuse ID Photos
              </button>
            </div>
          )}

          {/* Section 2: Upload 3 required photos */}
          <div>
            <h3 className="owner-ekyc-section-title">
              <Camera size={18} color="#286e74" />
              Verification Photos (3 Photos Required)
            </h3>

            <div className="owner-ekyc-images-grid">
              {/* 1. Front of ID */}
              <div
                className={`owner-ekyc-image-card ${frontPreview ? 'has-preview' : ''}`}
                style={{ opacity: isPending || isApproved ? 0.75 : 1 }}
              >
                <div className="owner-ekyc-image-badge-tag">
                  <CreditCard size={12} />
                  1. Front of ID Card
                </div>

                {frontPreview ? (
                  <div className="owner-ekyc-image-preview-box">
                    <img
                      src={frontPreview}
                      alt="Front of ID Card"
                      className="owner-ekyc-image-preview-img"
                    />
                    {!isPending && !isApproved && (
                      <div className="owner-ekyc-image-preview-overlay">
                        <label className="owner-ekyc-btn-overlay owner-ekyc-btn-change">
                          <RotateCcw size={13} />
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFrontFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <button
                          type="button"
                          className="owner-ekyc-btn-overlay owner-ekyc-btn-remove"
                          onClick={() => {
                            setFrontPreview('');
                            setFrontImage(null);
                          }}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="owner-ekyc-upload-dropzone">
                    <div className="owner-ekyc-upload-icon-circle">
                      {uploadingFront ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <Upload size={22} />
                      )}
                    </div>
                    <span className="owner-ekyc-upload-label">
                      {uploadingFront ? 'Uploading...' : 'Select Front of ID'}
                    </span>
                    <span className="owner-ekyc-upload-subtext">Straight angle, all 4 edges visible</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFrontFileChange}
                      disabled={uploadingFront || isPending || isApproved}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {uploadingFront && (
                  <div className="owner-ekyc-progress-bar-wrap">
                    <div className="owner-ekyc-progress-track">
                      <div
                        className="owner-ekyc-progress-fill"
                        style={{ width: `${frontProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Back of ID */}
              <div
                className={`owner-ekyc-image-card ${backPreview ? 'has-preview' : ''}`}
                style={{ opacity: isPending || isApproved ? 0.75 : 1 }}
              >
                <div className="owner-ekyc-image-badge-tag">
                  <CreditCard size={12} />
                  2. Back of ID Card
                </div>

                {backPreview ? (
                  <div className="owner-ekyc-image-preview-box">
                    <img
                      src={backPreview}
                      alt="Back of ID Card"
                      className="owner-ekyc-image-preview-img"
                    />
                    {!isPending && !isApproved && (
                      <div className="owner-ekyc-image-preview-overlay">
                        <label className="owner-ekyc-btn-overlay owner-ekyc-btn-change">
                          <RotateCcw size={13} />
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <button
                          type="button"
                          className="owner-ekyc-btn-overlay owner-ekyc-btn-remove"
                          onClick={() => {
                            setBackPreview('');
                            setBackImage(null);
                          }}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="owner-ekyc-upload-dropzone">
                    <div className="owner-ekyc-upload-icon-circle">
                      {uploadingBack ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <Upload size={22} />
                      )}
                    </div>
                    <span className="owner-ekyc-upload-label">
                      {uploadingBack ? 'Uploading...' : 'Select Back of ID'}
                    </span>
                    <span className="owner-ekyc-upload-subtext">Clear chip & fingerprint stamp</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackFileChange}
                      disabled={uploadingBack || isPending || isApproved}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {uploadingBack && (
                  <div className="owner-ekyc-progress-bar-wrap">
                    <div className="owner-ekyc-progress-track">
                      <div
                        className="owner-ekyc-progress-fill"
                        style={{ width: `${backProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Selfie holding ID */}
              <div
                className={`owner-ekyc-image-card ${holdingPreview ? 'has-preview' : ''}`}
                style={{
                  opacity: isPending || isApproved ? 0.75 : 1,
                }}
              >
                <div className="owner-ekyc-image-badge-tag highlight">
                  <Camera size={12} />
                  3. Selfie with ID Card
                </div>

                {holdingPreview ? (
                  <div className="owner-ekyc-image-preview-box">
                    <img
                      src={holdingPreview}
                      alt="Selfie holding ID Card"
                      className="owner-ekyc-image-preview-img"
                    />
                    {!isPending && !isApproved && (
                      <div className="owner-ekyc-image-preview-overlay">
                        <label className="owner-ekyc-btn-overlay owner-ekyc-btn-change">
                          <RotateCcw size={13} />
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHoldingFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <button
                          type="button"
                          className="owner-ekyc-btn-overlay owner-ekyc-btn-remove"
                          onClick={() => {
                            setHoldingPreview('');
                            setHoldingImage(null);
                          }}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="owner-ekyc-upload-dropzone">
                    <div className="owner-ekyc-upload-icon-circle">
                      {uploadingHolding ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <Camera size={22} />
                      )}
                    </div>
                    <span className="owner-ekyc-upload-label">
                      {uploadingHolding ? 'Uploading...' : 'Selfie Holding ID Card'}
                    </span>
                    <span className="owner-ekyc-upload-subtext">
                      Hold card at chest level, face & ID details clearly visible
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHoldingFileChange}
                      disabled={uploadingHolding || isPending || isApproved}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {uploadingHolding && (
                  <div className="owner-ekyc-progress-bar-wrap">
                    <div className="owner-ekyc-progress-track">
                      <div
                        className="owner-ekyc-progress-fill"
                        style={{ width: `${holdingProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: ID Number */}
          <div className="owner-ekyc-input-wrap">
            <label className="owner-ekyc-input-label">
              <CreditCard size={15} />
              National ID / Citizen Identification Number (12 digits)
            </label>
            <input
              type="text"
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
              placeholder="e.g. 001202012345"
              maxLength={12}
              disabled={isPending || isApproved}
              className="owner-ekyc-input-field"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="owner-ekyc-modal-footer">
          <button type="button" className="owner-ekyc-btn-cancel" onClick={onClose}>
            {isApproved ? 'Close' : 'Cancel'}
          </button>

          {!isApproved && !isPending && (
            <button
              type="button"
              className="owner-ekyc-btn-submit"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                uploadingFront ||
                uploadingBack ||
                uploadingHolding ||
                !isRenterVerified ||
                checkingStatus
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting application...
                </>
              ) : (
                <>
                  <Crown size={16} />
                  {isRejected ? 'Resubmit Owner Verification' : 'Submit Owner Verification'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerEkycSubmitModal;

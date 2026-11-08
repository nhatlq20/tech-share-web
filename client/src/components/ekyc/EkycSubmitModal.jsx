import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  CreditCard,
  Camera,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { uploadEkycImage } from '../../services/uploadService.js';
import './EkycSubmitModal.css';

/**
 * Modal nộp hồ sơ eKYC xác thực định danh người thuê (Renter)
 * ─────────────────────────────────────────────────────────────────────────────
 * Yêu cầu:
 * 1. Load các thông tin từ profile người dùng KHÔNG ĐƯỢC CHỈNH SỬA: Tên, Email, SĐT, Địa chỉ
 * 2. Nếu chưa cập nhật địa chỉ -> Bắt buộc phải cập nhật địa chỉ mới được eKYC
 * 3. Tải lên CCCD 2 mặt (Mặt trước, mặt sau) trực tiếp lên Cloudinary
 * 4. Lưu vào collection ekyc_requests qua API /ekyc/submit
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const EkycSubmitModal = ({
  isOpen,
  onClose,
  user = {},
  account = {},
  onSuccess,
  onOpenEditAddress,
}) => {
  // Ảnh CCCD 2 mặt
  const [frontImage, setFrontImage] = useState(null); // File hoặc URL
  const [frontPreview, setFrontPreview] = useState('');
  const [frontProgress, setFrontProgress] = useState(0);
  const [uploadingFront, setUploadingFront] = useState(false);

  const [backImage, setBackImage] = useState(null);
  const [backPreview, setBackPreview] = useState('');
  const [backProgress, setBackProgress] = useState(0);
  const [uploadingBack, setUploadingBack] = useState(false);

  const [idCardNumber, setIdCardNumber] = useState('');

  // Trạng thái hồ sơ từ server
  const [existingStatus, setExistingStatus] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Trạng thái gửi form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Thông tin user hiển thị (ReadOnly)
  const displayName = user?.name || '';
  const displayEmail = user?.email || account?.email || '';
  const displayPhone = user?.phone || '';
  const displayAddress = (user?.address || '').trim();
  const hasAddress = Boolean(displayAddress && displayAddress.length > 0);

  // Fetch trạng thái eKYC hiện tại khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');

    const fetchStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await api.get('/ekyc/status');
        if (res?.success && res?.data) {
          const reqData = res.data.request;
          setExistingRequest(reqData);
          if (res.data.isVerified) {
            setExistingStatus('approved');
          } else if (reqData?.status) {
            setExistingStatus(reqData.status);
            // If rejected, prefill previous data
            if (reqData.status === 'rejected') {
              if (reqData.idCardFrontUrl) setFrontPreview(reqData.idCardFrontUrl);
              if (reqData.idCardBackUrl) setBackPreview(reqData.idCardBackUrl);
              if (reqData.idCardNumber) setIdCardNumber(reqData.idCardNumber);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching eKYC status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle upload Front of ID card
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
      setFrontProgress(10);

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
      console.error('Front ID upload failed:', err);
      setErrorMsg('Failed to upload front image of ID card. Please try again.');
      setFrontPreview('');
      setFrontImage(null);
    } finally {
      setUploadingFront(false);
      setFrontProgress(0);
    }
  };

  // Handle upload Back of ID card
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
      setBackProgress(10);

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
      console.error('Back ID upload failed:', err);
      setErrorMsg('Failed to upload back image of ID card. Please try again.');
      setBackPreview('');
      setBackImage(null);
    } finally {
      setUploadingBack(false);
      setBackProgress(0);
    }
  };

  // Submit eKYC application
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Check address
    if (!hasAddress) {
      setErrorMsg('Your address is missing. Please update your delivery address before submitting eKYC.');
      return;
    }

    // 2. Check 2 sides
    const finalFront = frontImage || frontPreview;
    const finalBack = backImage || backPreview;

    if (!finalFront || !finalBack) {
      setErrorMsg('Please upload both front and back photos of your National ID card.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await api.post('/ekyc/submit', {
        idCardFrontUrl: finalFront,
        idCardBackUrl: finalBack,
        idCardNumber: idCardNumber.trim(),
      });

      if (res?.success) {
        setSuccessMsg(res.message || 'eKYC application submitted successfully! Administrators will review your request shortly.');
        setExistingStatus('pending');
        setExistingRequest(res.data);

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
      const msg = err.data?.message || err.message || 'Unable to submit eKYC application. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ekyc-modal-backdrop" onClick={onClose}>
      <div className="ekyc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ekyc-modal-header">
          <div className="ekyc-modal-header-info">
            <div className="ekyc-modal-icon-badge">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2 className="ekyc-modal-title">eKYC Identity Verification</h2>
              <p className="ekyc-modal-subtitle">
                Verify National ID (CCCD) to qualify for renting tech equipment on TechShare
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ekyc-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ekyc-modal-body">
          {/* Approved status banner */}
          {existingStatus === 'approved' && (
            <div className="ekyc-alert ekyc-alert-success">
              <CheckCircle2 size={20} className="shrink-0" />
              <div>
                <strong>Account has completed eKYC verification!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Your National ID has been reviewed and approved by administrators. You are now verified and can rent any equipment.
                </p>
              </div>
            </div>
          )}

          {/* Pending status banner */}
          {existingStatus === 'pending' && (
            <div className="ekyc-alert ekyc-alert-pending">
              <Clock size={20} className="shrink-0" />
              <div>
                <strong>Your eKYC application is under review!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  TechShare administration is verifying your ID card. This process typically takes up to 24 business hours.
                </p>
              </div>
            </div>
          )}

          {/* Rejected status banner */}
          {existingStatus === 'rejected' && (
            <div className="ekyc-alert ekyc-alert-warning">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <strong>Previous application was not approved:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Reason: &quot;{existingRequest?.rejectReason || 'Image is blurry or details do not match'}&quot;.
                  Please retake clear photos of all 4 corners of your ID card and resubmit below.
                </p>
              </div>
            </div>
          )}

          {/* General error or address warning */}
          {errorMsg && (
            <div className="ekyc-alert ekyc-alert-error">
              <AlertCircle size={20} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="ekyc-alert ekyc-alert-success">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ADDRESS WARNING */}
          {!hasAddress && (
            <div className="ekyc-alert ekyc-alert-warning">
              <AlertCircle size={22} className="shrink-0 text-amber-600" />
              <div style={{ flex: 1 }}>
                <strong>You have not updated your delivery address!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  According to TechShare terms, renters must update their permanent / delivery address in their profile before submitting eKYC.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (typeof onOpenEditAddress === 'function') {
                      onOpenEditAddress();
                    }
                  }}
                  className="ekyc-btn-update-addr"
                >
                  <MapPin size={14} />
                  <span>Update Profile Address Now</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 1: Personal profile information (Read-only) */}
          <div className="ekyc-section-block">
            <div className="ekyc-section-heading">
              <span className="ekyc-section-title">
                <User size={16} style={{ color: '#67bec3' }} />
                Personal Profile Information
              </span>
              <span className="ekyc-badge-readonly">
                <Lock size={10} style={{ display: 'inline', marginRight: 4 }} />
                Fixed from Profile
              </span>
            </div>

            <div className="ekyc-readonly-grid">
              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <User size={13} /> Full Name
                </label>
                <div className="ekyc-field-input-wrap">
                  <User size={15} />
                  <input
                    type="text"
                    className="ekyc-field-input"
                    value={displayName || '---'}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <Mail size={13} /> Contact Email
                </label>
                <div className="ekyc-field-input-wrap">
                  <Mail size={15} />
                  <input
                    type="text"
                    className="ekyc-field-input"
                    value={displayEmail || '---'}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <Phone size={13} /> Phone Number
                </label>
                <div className="ekyc-field-input-wrap">
                  <Phone size={15} />
                  <input
                    type="text"
                    className="ekyc-field-input"
                    value={displayPhone || 'Not updated'}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <MapPin size={13} /> Address
                </label>
                <div className="ekyc-field-input-wrap">
                  <MapPin size={15} />
                  <input
                    type="text"
                    className={`ekyc-field-input ${!hasAddress ? 'has-error' : ''}`}
                    value={displayAddress || 'Not updated (Required)'}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ID Card Photos (Front & Back) */}
          <div className="ekyc-section-block">
            <div className="ekyc-section-heading">
              <span className="ekyc-section-title">
                <CreditCard size={16} style={{ color: '#286e74' }} />
                National ID Photos (2 Sides)
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Clear photos, no glare, with all 4 corners visible
              </span>
            </div>

            <div className="ekyc-upload-grid">
              {/* Front Side */}
              <div className={`ekyc-upload-card ${frontPreview ? 'has-image' : ''}`}>
                {frontPreview ? (
                  <div className="ekyc-preview-wrap">
                    <img
                      src={frontPreview}
                      alt="Front of ID Card"
                      className="ekyc-preview-img"
                    />
                    <div className="ekyc-preview-badge">Front of ID Card</div>
                    {existingStatus !== 'pending' && existingStatus !== 'approved' && (
                      <div className="ekyc-preview-actions">
                        <button
                          type="button"
                          className="ekyc-preview-btn-delete"
                          onClick={() => {
                            setFrontPreview('');
                            setFrontImage(null);
                          }}
                          title="Delete and choose another photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="ekyc-upload-icon-circle">
                      <Camera size={22} />
                    </div>
                    <span className="ekyc-upload-card-title">Front of ID Card</span>
                    <span className="ekyc-upload-card-desc">
                      Capture the front showing your portrait photo, full name, and ID number
                    </span>

                    {uploadingFront ? (
                      <div className="ekyc-progress-box">
                        <div className="ekyc-progress-bar-bg">
                          <div
                            className="ekyc-progress-bar-fill"
                            style={{ width: `${frontProgress || 45}%` }}
                          />
                        </div>
                        <span className="ekyc-progress-text">
                          Uploading to Cloudinary... {frontProgress}%
                        </span>
                      </div>
                    ) : (
                      <label className="ekyc-upload-btn-label">
                        <Upload size={14} />
                        <span>Upload Front Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFrontFileChange}
                          style={{ display: 'none' }}
                          disabled={!hasAddress || existingStatus === 'pending'}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>

              {/* Back Side */}
              <div className={`ekyc-upload-card ${backPreview ? 'has-image' : ''}`}>
                {backPreview ? (
                  <div className="ekyc-preview-wrap">
                    <img
                      src={backPreview}
                      alt="Back of ID Card"
                      className="ekyc-preview-img"
                    />
                    <div className="ekyc-preview-badge">Back of ID Card</div>
                    {existingStatus !== 'pending' && existingStatus !== 'approved' && (
                      <div className="ekyc-preview-actions">
                        <button
                          type="button"
                          className="ekyc-preview-btn-delete"
                          onClick={() => {
                            setBackPreview('');
                            setBackImage(null);
                          }}
                          title="Delete and choose another photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="ekyc-upload-icon-circle" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                      <Camera size={22} />
                    </div>
                    <span className="ekyc-upload-card-title">Back of ID Card</span>
                    <span className="ekyc-upload-card-desc">
                      Capture the back showing identification features, issue date, and chip
                    </span>

                    {uploadingBack ? (
                      <div className="ekyc-progress-box">
                        <div className="ekyc-progress-bar-bg">
                          <div
                            className="ekyc-progress-bar-fill"
                            style={{ width: `${backProgress || 45}%`, background: '#7c3aed' }}
                          />
                        </div>
                        <span className="ekyc-progress-text">
                          Uploading to Cloudinary... {backProgress}%
                        </span>
                      </div>
                    ) : (
                      <label className="ekyc-upload-btn-label" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                        <Upload size={14} />
                        <span>Upload Back Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackFileChange}
                          style={{ display: 'none' }}
                          disabled={!hasAddress || existingStatus === 'pending'}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* National ID Number */}
            <div style={{ marginTop: 14 }}>
              <label className="ekyc-field-label" style={{ marginBottom: 4 }}>
                <CreditCard size={13} /> National ID / Citizen ID Number (12 digits)
              </label>
              <div className="ekyc-field-input-wrap">
                <CreditCard size={15} />
                <input
                  type="text"
                  maxLength={12}
                  className="ekyc-field-input"
                  style={{ cursor: 'text', backgroundColor: '#ffffff' }}
                  placeholder="e.g. 001202008899..."
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={existingStatus === 'pending' || existingStatus === 'approved'}
                />
              </div>
            </div>
          </div>

          {/* Security pledge */}
          <div className="ekyc-security-box">
            <ShieldCheck size={20} style={{ color: '#286e74', flexShrink: 0 }} />
            <span className="ekyc-security-text">
              TechShare commits to safeguarding your personal data in accordance with information security standards. ID data is solely used to verify your identity for rental security deposits and is never shared with third parties.
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="ekyc-modal-footer">
          <button
            type="button"
            className="ekyc-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>

          {existingStatus !== 'approved' && (
            <button
              type="button"
              className="ekyc-btn-submit"
              onClick={handleSubmit}
              disabled={
                !hasAddress ||
                !frontPreview ||
                !backPreview ||
                uploadingFront ||
                uploadingBack ||
                isSubmitting ||
                existingStatus === 'pending'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting application...</span>
                </>
              ) : existingStatus === 'pending' ? (
                <>
                  <Clock size={16} />
                  <span>Application Under Review</span>
                </>
              ) : (
                <>
                  <span>Submit eKYC Verification</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EkycSubmitModal;

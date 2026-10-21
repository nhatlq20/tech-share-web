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
            // Nếu có ảnh cũ từ đơn bị từ chối, có thể load sẵn
            if (reqData.status === 'rejected') {
              if (reqData.idCardFrontUrl) setFrontPreview(reqData.idCardFrontUrl);
              if (reqData.idCardBackUrl) setBackPreview(reqData.idCardBackUrl);
              if (reqData.idCardNumber) setIdCardNumber(reqData.idCardNumber);
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy trạng thái eKYC:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý upload mặt trước CCCD
  const handleFrontFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP).');
      return;
    }

    try {
      setErrorMsg('');
      setUploadingFront(true);
      setFrontProgress(10);

      // Tạo preview cục bộ ngay lập tức
      const localUrl = URL.createObjectURL(file);
      setFrontPreview(localUrl);

      // Upload lên Cloudinary
      const res = await uploadEkycImage(file, {
        onProgress: (p) => setFrontProgress(p),
      });

      if (res?.url) {
        setFrontImage(res.url);
        setFrontPreview(res.url);
      }
    } catch (err) {
      console.error('Upload mặt trước thất bại:', err);
      setErrorMsg('Tải lên ảnh mặt trước CCCD thất bại. Vui lòng thử lại.');
      setFrontPreview('');
      setFrontImage(null);
    } finally {
      setUploadingFront(false);
      setFrontProgress(0);
    }
  };

  // Xử lý upload mặt sau CCCD
  const handleBackFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP).');
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
      console.error('Upload mặt sau thất bại:', err);
      setErrorMsg('Tải lên ảnh mặt sau CCCD thất bại. Vui lòng thử lại.');
      setBackPreview('');
      setBackImage(null);
    } finally {
      setUploadingBack(false);
      setBackProgress(0);
    }
  };

  // Nộp đơn eKYC
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Kiểm tra địa chỉ
    if (!hasAddress) {
      setErrorMsg('Bạn chưa cập nhật địa chỉ. Vui lòng cập nhật địa chỉ trước khi gửi hồ sơ eKYC.');
      return;
    }

    // 2. Kiểm tra ảnh 2 mặt
    const finalFront = frontImage || frontPreview;
    const finalBack = backImage || backPreview;

    if (!finalFront || !finalBack) {
      setErrorMsg('Vui lòng tải lên đầy đủ hình ảnh CCCD 2 mặt (Mặt trước và Mặt sau).');
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
        setSuccessMsg(res.message || 'Gửi hồ sơ eKYC thành công! Quản trị viên sẽ sớm duyệt hồ sơ của bạn.');
        setExistingStatus('pending');
        setExistingRequest(res.data);

        if (typeof onSuccess === 'function') {
          onSuccess(res.data);
        }

        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res?.message || 'Có lỗi xảy ra khi nộp hồ sơ.');
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Không thể gửi hồ sơ eKYC. Vui lòng thử lại.';
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
              <h2 className="ekyc-modal-title">Xác thực danh tính eKYC</h2>
              <p className="ekyc-modal-subtitle">
                Định danh CCCD để đủ điều kiện đặt thuê thiết bị công nghệ trên TechShare
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ekyc-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ekyc-modal-body">
          {/* Thông báo trạng thái đã duyệt */}
          {existingStatus === 'approved' && (
            <div className="ekyc-alert ekyc-alert-success">
              <CheckCircle2 size={20} className="shrink-0" />
              <div>
                <strong>Tài khoản đã hoàn tất xác thực eKYC!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Hồ sơ CCCD của bạn đã được quản trị viên phê duyệt. Bạn đã có tích xanh và có thể thuê mọi thiết bị.
                </p>
              </div>
            </div>
          )}

          {/* Thông báo trạng thái đang chờ duyệt */}
          {existingStatus === 'pending' && (
            <div className="ekyc-alert ekyc-alert-pending">
              <Clock size={20} className="shrink-0" />
              <div>
                <strong>Hồ sơ eKYC của bạn đang chờ xét duyệt!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Ban quản trị TechShare đang kiểm tra tính hợp lệ của CCCD. Quá trình này thường diễn ra trong vòng 24 giờ làm việc.
                </p>
              </div>
            </div>
          )}

          {/* Thông báo trạng thái bị từ chối */}
          {existingStatus === 'rejected' && (
            <div className="ekyc-alert ekyc-alert-warning">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <strong>Hồ sơ trước đó chưa được chấp thuận:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Lý do: &quot;{existingRequest?.rejectReason || 'Ảnh chụp không rõ nét hoặc thông tin không khớp'}&quot;.
                  Vui lòng chụp lại ảnh CCCD rõ ràng, đủ 4 góc và gửi lại bên dưới.
                </p>
              </div>
            </div>
          )}

          {/* Lỗi chung hoặc cảnh báo địa chỉ */}
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

          {/* CẢNH BÁO ĐỊA CHỈ: Bắt buộc phải có địa chỉ trước khi eKYC */}
          {!hasAddress && (
            <div className="ekyc-alert ekyc-alert-warning">
              <AlertCircle size={22} className="shrink-0 text-amber-600" />
              <div style={{ flex: 1 }}>
                <strong>Bạn chưa cập nhật địa chỉ nhận hàng!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>
                  Theo quy định của TechShare, người thuê cần cập nhật địa chỉ thường trú / nhận hàng trong hồ sơ trước khi nộp đơn định danh eKYC.
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
                  <span>Cập nhật địa chỉ hồ sơ ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* KHỐI 1: Thông tin từ hồ sơ người dùng (Read-only) */}
          <div className="ekyc-section-block">
            <div className="ekyc-section-heading">
              <span className="ekyc-section-title">
                <User size={16} style={{ color: '#67bec3' }} />
                Thông tin hồ sơ cá nhân
              </span>
              <span className="ekyc-badge-readonly">
                <Lock size={10} style={{ display: 'inline', marginRight: 4 }} />
                Cố định từ hồ sơ
              </span>
            </div>

            <div className="ekyc-readonly-grid">
              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <User size={13} /> Họ và tên
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
                  <Mail size={13} /> Email liên hệ
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
                  <Phone size={13} /> Số điện thoại
                </label>
                <div className="ekyc-field-input-wrap">
                  <Phone size={15} />
                  <input
                    type="text"
                    className="ekyc-field-input"
                    value={displayPhone || 'Chưa cập nhật'}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="ekyc-field-box">
                <label className="ekyc-field-label">
                  <MapPin size={13} /> Địa chỉ
                </label>
                <div className="ekyc-field-input-wrap">
                  <MapPin size={15} />
                  <input
                    type="text"
                    className={`ekyc-field-input ${!hasAddress ? 'has-error' : ''}`}
                    value={displayAddress || 'Chưa cập nhật (Bắt buộc phải cập nhật)'}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 2: Tải lên CCCD 2 mặt (Mặt trước, mặt sau) */}
          <div className="ekyc-section-block">
            <div className="ekyc-section-heading">
              <span className="ekyc-section-title">
                <CreditCard size={16} style={{ color: '#286e74' }} />
                Hình ảnh CCCD 2 mặt
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Ảnh rõ nét, không bị chói sáng hoặc mất góc
              </span>
            </div>

            <div className="ekyc-upload-grid">
              {/* Mặt trước */}
              <div className={`ekyc-upload-card ${frontPreview ? 'has-image' : ''}`}>
                {frontPreview ? (
                  <div className="ekyc-preview-wrap">
                    <img
                      src={frontPreview}
                      alt="CCCD Mặt trước"
                      className="ekyc-preview-img"
                    />
                    <div className="ekyc-preview-badge">Mặt trước CCCD</div>
                    {existingStatus !== 'pending' && existingStatus !== 'approved' && (
                      <div className="ekyc-preview-actions">
                        <button
                          type="button"
                          className="ekyc-preview-btn-delete"
                          onClick={() => {
                            setFrontPreview('');
                            setFrontImage(null);
                          }}
                          title="Xóa và chọn ảnh khác"
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
                    <span className="ekyc-upload-card-title">CCCD Mặt trước</span>
                    <span className="ekyc-upload-card-desc">
                      Chụp mặt trước chứa ảnh chân dung, họ tên và số định danh
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
                          Đang tải lên Cloudinary... {frontProgress}%
                        </span>
                      </div>
                    ) : (
                      <label className="ekyc-upload-btn-label">
                        <Upload size={14} />
                        <span>Tải ảnh mặt trước</span>
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

              {/* Mặt sau */}
              <div className={`ekyc-upload-card ${backPreview ? 'has-image' : ''}`}>
                {backPreview ? (
                  <div className="ekyc-preview-wrap">
                    <img
                      src={backPreview}
                      alt="CCCD Mặt sau"
                      className="ekyc-preview-img"
                    />
                    <div className="ekyc-preview-badge">Mặt sau CCCD</div>
                    {existingStatus !== 'pending' && existingStatus !== 'approved' && (
                      <div className="ekyc-preview-actions">
                        <button
                          type="button"
                          className="ekyc-preview-btn-delete"
                          onClick={() => {
                            setBackPreview('');
                            setBackImage(null);
                          }}
                          title="Xóa và chọn ảnh khác"
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
                    <span className="ekyc-upload-card-title">CCCD Mặt sau</span>
                    <span className="ekyc-upload-card-desc">
                      Chụp mặt sau chứa đặc điểm nhân dạng, ngày cấp và mã chip
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
                          Đang tải lên Cloudinary... {backProgress}%
                        </span>
                      </div>
                    ) : (
                      <label className="ekyc-upload-btn-label" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}>
                        <Upload size={14} />
                        <span>Tải ảnh mặt sau</span>
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

            {/* Số CCCD (Tùy chọn bổ sung) */}
            <div style={{ marginTop: 14 }}>
              <label className="ekyc-field-label" style={{ marginBottom: 4 }}>
                <CreditCard size={13} /> Số CCCD / CMND (12 chữ số)
              </label>
              <div className="ekyc-field-input-wrap">
                <CreditCard size={15} />
                <input
                  type="text"
                  maxLength={12}
                  className="ekyc-field-input"
                  style={{ cursor: 'text', backgroundColor: '#ffffff' }}
                  placeholder="Ví dụ: 001202008899..."
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={existingStatus === 'pending' || existingStatus === 'approved'}
                />
              </div>
            </div>
          </div>

          {/* Cam kết bảo mật */}
          <div className="ekyc-security-box">
            <ShieldCheck size={20} style={{ color: '#286e74', flexShrink: 0 }} />
            <span className="ekyc-security-text">
              TechShare cam kết bảo mật tuyệt đối dữ liệu cá nhân theo tiêu chuẩn an toàn thông tin. Dữ liệu CCCD chỉ dùng để định danh ký quỹ thuê thiết bị và không chia sẻ cho bên thứ ba.
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
            Đóng
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
                  <span>Đang gửi hồ sơ...</span>
                </>
              ) : existingStatus === 'pending' ? (
                <>
                  <Clock size={16} />
                  <span>Đang chờ duyệt hồ sơ</span>
                </>
              ) : (
                <>
                  <span>Gửi hồ sơ xác thực eKYC</span>
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

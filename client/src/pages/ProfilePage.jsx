import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Star,
  Award,
  Sparkles,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Camera,
  AlertCircle,
  Edit3,
  X,
  Save,
  Clock,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { uploadAvatar } from '../services/uploadService.js';
import { EkycSubmitModal } from '../components/ekyc/EkycSubmitModal.jsx';
import { OwnerEkycSubmitModal } from '../components/ekyc/OwnerEkycSubmitModal.jsx';
import { getMyOwnerEkycStatus } from '../services/ownerEkycService.js';
import { ROUTES } from '../routes/routes.js';
import './ProfilePage.css';

// Hàm định dạng tiền tệ VND
const formatVND = (amount = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: authUser, account: authAccount, token, isAuthenticated, logout, login } = useAuth();

  const [userData, setUserData] = useState(authUser);
  const [accountData, setAccountData] = useState(authAccount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái upload avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Trạng thái eKYC Renter & Modal eKYC
  const [isEkycModalOpen, setIsEkycModalOpen] = useState(false);
  const [ekycRequestData, setEkycRequestData] = useState(null);

  // Trạng thái eKYC Nâng Cấp Owner & Modal Owner eKYC
  const [isOwnerEkycModalOpen, setIsOwnerEkycModalOpen] = useState(false);
  const [ownerEkycData, setOwnerEkycData] = useState(null);

  // Trạng thái Modal Edit Profile (Cập nhật địa chỉ & thông tin cá nhân)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState(null);

  // Lấy thông tin trạng thái eKYC của user
  useEffect(() => {
    if (!token) return;
    api.get('/ekyc/status')
      .then((res) => {
        if (res?.success && res?.data) {
          setEkycRequestData(res.data.request || null);
        }
      })
      .catch(() => {});

    getMyOwnerEkycStatus()
      .then((res) => {
        if (res?.success && res?.data) {
          setOwnerEkycData(res.data);
        }
      })
      .catch(() => {});
  }, [token]);

  const openEditModal = () => {
    const curProfile = userData || authUser || {};
    setEditForm({
      name: curProfile.name || '',
      phone: curProfile.phone || '',
      address: curProfile.address || '',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setEditError(null);

      const res = await api.patch(
        '/users/profile',
        {
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.success && res?.user) {
        setUserData(res.user);

        // Đồng bộ AuthContext & localStorage để Navbar tự cập nhật
        login({
          token,
          user: res.user,
          account: accountData || authAccount,
        });

        setIsEditModalOpen(false);
        setFeedbackMsg({
          type: 'success',
          text: 'Cập nhật địa chỉ và thông tin hồ sơ thành công!',
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        setEditError(res?.message || 'Không thể lưu thay đổi.');
      }
    } catch (err) {
      console.error('Lỗi cập nhật profile:', err);
      setEditError(err.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    // Nếu chưa đăng nhập, chuyển hướng sang trang Login
    if (!isAuthenticated && !token) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Gọi API backend nạp dữ liệu trực tiếp từ collection `users`
        const res = await api.get('/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res?.success && res?.user) {
          setUserData(res.user);
          if (res.account) {
            setAccountData(res.account);
          }
        }
      } catch (err) {
        console.error('Không thể tải profile từ collection users:', err);
        setError('Không thể đồng bộ dữ liệu mới nhất từ máy chủ. Hiển thị dữ liệu cục bộ.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [token, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
  };

  /**
   * handleAvatarUpload – flow tối ưu hiệu suất:
   *   1. Validate file (type, size)
   *   2. Nén + resize bằng Canvas (không thư viện ngoài)
   *   3. Upload thẳng từ browser → Cloudinary (XHR có progress)
   *   4. Chỉ gửi URL ngắn lên server để lưu DB (~100 bytes thay vì ~MB)
   */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ type: 'error', text: 'Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).' });
      return;
    }

    // Giới hạn 20MB (sẽ nén xuống rất nhỏ trước khi upload)
    if (file.size > 20 * 1024 * 1024) {
      setFeedbackMsg({ type: 'error', text: 'File ảnh không được vượt quá 20MB.' });
      return;
    }

    try {
      setUploadingAvatar(true);
      setUploadProgress(0);
      setFeedbackMsg(null);

      // Bước 1 + 2: Nén & upload thẳng lên Cloudinary từ browser
      // Server KHÔNG nhận ảnh nặng – chỉ nhận URL cuối (~80 ký tự)
      const { url: avatarUrl, compressedSize, savingsPct } = await uploadAvatar(file, {
        maxSize: 800,
        quality: 0.82,
        onProgress: (pct) => setUploadProgress(pct),
      });

      // Bước 3: Gửi chỉ URL lên server để lưu vào DB
      const res = await api.patch(
        '/users/avatar',
        { avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.success) {
        const newAvatar = res.avatar || avatarUrl;

        // Cập nhật state local
        setUserData((prev) => ({ ...prev, avatar: newAvatar }));

        // Đồng bộ AuthContext + localStorage → Navbar tự cập nhật
        login({
          token,
          user: res.user ? res.user : { ...(userData || authUser), avatar: newAvatar },
          account: accountData || authAccount,
        });

        setFeedbackMsg({
          type: 'success',
          text: `Cập nhật avatar thành công! (Đã nén ${savingsPct}%, còn ${(compressedSize / 1024).toFixed(0)}KB)`,
        });
        setTimeout(() => setFeedbackMsg(null), 5000);
      } else {
        setFeedbackMsg({ type: 'error', text: res?.message || 'Không thể lưu ảnh đại diện.' });
      }
    } catch (err) {
      console.error('[Avatar] Upload lỗi:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Lỗi khi tải ảnh lên. Vui lòng thử lại.',
      });
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  if (!isAuthenticated && !token) {
    return null;
  }

  if (loading && !userData && !authUser) {
    return (
      <div className="profile-page-root">
        <div className="profile-container">
          <div className="profile-state-card">
            <div className="profile-spinner" />
            <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>
              Đang tải thông tin hồ sơ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sử dụng dữ liệu từ collection users (ưu tiên dữ liệu mới lấy từ server)
  const profile = userData || authUser || {};
  const account = accountData || authAccount || {};
  const isAccountVerified = Boolean(
    account?.isVerified ||
    profile?.isVerified ||
    profile?.trust?.isVerified ||
    ekycRequestData?.status === 'approved'
  );

  return (
    <div className="profile-page-root">
      <div className="profile-container">
        {/* Nút điều hướng đầu trang */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Link to={ROUTES.HOME} className="profile-btn-action">
            <ArrowLeft size={16} />
            Quay lại Trang chủ
          </Link>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', color: '#b45309', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Thông báo cập nhật Avatar */}
        {feedbackMsg && (
          <div
            style={{
              padding: '12px 16px',
              background: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${feedbackMsg.type === 'success' ? '#dcfce7' : '#fee2e2'}`,
              borderRadius: '12px',
              color: feedbackMsg.type === 'success' ? '#15803d' : '#b91c1c',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-cover" />
          <div className="profile-hero-content">
            <div className="profile-hero-main-row">
              {/* Avatar từ collection users & nút đổi ảnh Cloudinary */}
              <div className="profile-avatar-wrap">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name || 'User Avatar'}
                    className="profile-avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement.querySelector('.profile-avatar-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="profile-avatar-fallback"
                  style={{ display: profile.avatar ? 'none' : 'flex' }}
                >
                  {(profile.name || account.username || 'U').charAt(0).toUpperCase()}
                </div>

                {/* Overlay upload với progress bar */}
                {uploadingAvatar && (
                  <div className="profile-avatar-loading-overlay">
                    {uploadProgress > 0 ? (
                      <div className="profile-upload-progress-ring">
                        <svg viewBox="0 0 36 36" width="48" height="48">
                          <circle
                            cx="18" cy="18" r="15.9"
                            fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"
                          />
                          <circle
                            cx="18" cy="18" r="15.9"
                            fill="none" stroke="#67BEC3" strokeWidth="2.5"
                            strokeDasharray={`${uploadProgress} 100`}
                            strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                          />
                        </svg>
                        <span className="profile-upload-pct">{uploadProgress}%</span>
                      </div>
                    ) : (
                      <div className="profile-spinner-sm" />
                    )}
                  </div>
                )}

                {/* Nút camera đổi ảnh đại diện */}
                <label
                  htmlFor="profile-avatar-input"
                  className="profile-avatar-upload-trigger"
                  title="Đổi ảnh đại diện (Tải lên Cloudinary)"
                >
                  <Camera size={15} />
                  <input
                    id="profile-avatar-input"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="profile-hero-actions">
                {/* Nút Submit eKYC cho Renter */}
                <button
                  type="button"
                  onClick={() => setIsEkycModalOpen(true)}
                  className={`profile-btn-action ${isAccountVerified ? 'profile-btn-verified' : 'profile-btn-ekyc'}`}
                  title={
                    isAccountVerified
                      ? 'Tài khoản đã hoàn tất xác thực eKYC CCCD'
                      : 'Xác thực định danh eKYC để được quyền thuê thiết bị'
                  }
                >
                  <ShieldCheck size={15} />
                  <span>
                    {isAccountVerified
                      ? 'eKYC Đã xác thực'
                      : ekycRequestData?.status === 'pending'
                      ? 'eKYC Đang chờ duyệt'
                      : ekycRequestData?.status === 'rejected'
                      ? 'Nộp lại eKYC'
                      : 'Submit eKYC'}
                  </span>
                </button>

                {/* Nút nâng cấp lên Owner khi người thuê đã hoàn tất eKYC thuê */}
                {isAccountVerified && profile.role !== 'owner' && profile.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => setIsOwnerEkycModalOpen(true)}
                    className="profile-btn-action"
                    style={{
                      background: 'linear-gradient(135deg, #67bec3 0%, #286e74 100%)',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(103, 190, 195, 0.3)',
                    }}
                    title="Upgrade to Device Owner to list and rent out equipment"
                  >
                    <Crown size={15} />
                    <span>
                      {ownerEkycData?.request?.status === 'pending'
                        ? 'Owner Pending'
                        : ownerEkycData?.request?.status === 'rejected'
                        ? 'Resubmit Owner eKYC'
                        : 'Upgrade to Owner'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openEditModal}
                  className="profile-btn-action profile-btn-edit"
                  title="Chỉnh sửa thông tin cá nhân & địa chỉ"
                >
                  <Edit3 size={15} />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="profile-btn-action profile-btn-logout"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            </div>

            {/* User Main Details */}
            <div className="profile-user-headline">
              <div className="profile-name-row">
                <h1 className="profile-user-name">
                  {profile.name || 'TechShare User'}
                </h1>
                <span className={`profile-role-pill profile-role-${profile.role || 'renter'}`}>
                  {profile.role === 'admin' ? 'Quản trị viên' : profile.role === 'owner' ? 'Chủ thiết bị' : 'Người thuê'}
                </span>
                {isAccountVerified ? (
                  <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                    <ShieldCheck size={14} />
                    eKYC Verified
                  </span>
                ) : ekycRequestData?.status === 'pending' ? (
                  <span
                    className="profile-badge-tag"
                    style={{ background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}
                    onClick={() => setIsEkycModalOpen(true)}
                    title="Bấm để xem chi tiết hồ sơ eKYC đang chờ duyệt"
                  >
                    <Clock size={14} />
                    Đang chờ duyệt eKYC
                  </span>
                ) : ekycRequestData?.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => setIsEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', cursor: 'pointer' }}
                    title="Hồ sơ bị từ chối - Bấm để nộp lại"
                  >
                    <AlertCircle size={14} />
                    eKYC bị từ chối (Nộp lại)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', cursor: 'pointer' }}
                    title="Người thuê bắt buộc phải có eKYC mới thuê được sản phẩm"
                  >
                    <AlertCircle size={14} />
                    Chưa eKYC (Bấm xác thực)
                  </button>
                )}

                {/* Badge trạng thái Owner eKYC */}
                {profile.role === 'owner' ? (
                  <span className="profile-badge-tag" style={{ background: '#e8f6f7', color: '#286e74', border: '1px solid #b2e2e4' }}>
                    <Crown size={14} />
                    Owner Verified
                  </span>
                ) : ownerEkycData?.request?.status === 'pending' ? (
                  <span
                    className="profile-badge-tag"
                    style={{ background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', border: '1px solid #bfdbfe' }}
                    onClick={() => setIsOwnerEkycModalOpen(true)}
                    title="Bấm để xem chi tiết hồ sơ nâng cấp Owner đang chờ duyệt"
                  >
                    <Clock size={14} />
                    Đang chờ duyệt Owner
                  </span>
                ) : ownerEkycData?.request?.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => setIsOwnerEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', cursor: 'pointer' }}
                    title="Hồ sơ nâng cấp Owner bị từ chối - Bấm để nộp lại"
                  >
                    <AlertCircle size={14} />
                    Owner eKYC bị từ chối (Nộp lại)
                  </button>
                ) : null}
              </div>

              <div className="profile-user-meta-sub">
                <div className="profile-meta-item">
                  <Mail size={14} />
                  <span>{profile.email || account.email || 'Chưa cập nhật email'}</span>
                </div>
                {profile.phone && (
                  <div className="profile-meta-item">
                    <Phone size={14} />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="profile-meta-item">
                    <MapPin size={14} />
                    <span>{profile.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI & Metrics Bar */}
        <div className="profile-kpi-grid">
          {/* Ví khả dụng */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#e8f6f7', color: '#286E74' }}>
              <Wallet size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Số dư ví khả dụng</span>
              <span className="profile-kpi-value">{formatVND(profile.walletBalance ?? 0)}</span>
              <span className="profile-kpi-sub">Sẵn sàng thanh toán & nhận tiền</span>
            </div>
          </div>

          {/* Ví ký quỹ bảo đảm */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
              <ShieldCheck size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Tiền ký quỹ (Escrow)</span>
              <span className="profile-kpi-value">{formatVND(profile.walletEscrowBalance ?? 0)}</span>
              <span className="profile-kpi-sub">Bảo đảm giao dịch an toàn</span>
            </div>
          </div>

          {/* Điểm tín nhiệm */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Award size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Điểm tín nhiệm Escrow</span>
              <span className="profile-kpi-value">{profile.trustScore ?? 100} / 100</span>
              <span className="profile-kpi-sub">Mức tín nhiệm tối đa</span>
            </div>
          </div>

          {/* Đánh giá */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#fef9c3', color: '#ca8a04' }}>
              <Star size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Đánh giá trung bình</span>
              <span className="profile-kpi-value">{profile.rating ?? 5.0} ★</span>
              <span className="profile-kpi-sub">{profile.totalReviews ?? 0} lượt phản hồi</span>
            </div>
          </div>
        </div>

        {/* Card Nâng cấp lên Chủ thiết bị (Owner) nếu người thuê đã hoàn tất eKYC thuê */}
        {isAccountVerified && profile.role !== 'owner' && profile.role !== 'admin' && (
          <div
            style={{
              background: 'linear-gradient(135deg, #e8f6f7 0%, #f0fdfa 100%)',
              border: '1px solid #b2e2e4',
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #67bec3 0%, #286e74 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(103, 190, 195, 0.25)',
                  flexShrink: 0,
                }}
              >
                <Crown size={24} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#1f565b',
                    margin: '0 0 0.25rem 0',
                  }}
                >
                  Become a Device Owner on TechShare
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#286e74', margin: 0 }}>
                  {ownerEkycData?.request?.status === 'pending'
                    ? 'Your Owner verification request is currently under review by administrators.'
                    : ownerEkycData?.request?.status === 'rejected'
                    ? `Your Owner verification was rejected (${ownerEkycData.request.rejectReason}). Click to resubmit.`
                    : 'You have completed Renter verification! Submit a selfie holding your ID card to start listing devices and earning rental income.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOwnerEkycModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.625rem',
                background: 'linear-gradient(135deg, #67bec3 0%, #286e74 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(103, 190, 195, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <Crown size={16} />
              {ownerEkycData?.request?.status === 'pending'
                ? 'View Pending Request'
                : ownerEkycData?.request?.status === 'rejected'
                ? 'Resubmit Owner eKYC'
                : 'Verify to Become Owner'}
            </button>
          </div>
        )}

        {/* 2 Cột chi tiết: Hồ sơ cá nhân & Tài khoản */}
        <div className="profile-details-grid">
          {/* Card 1: Thông tin cá nhân */}
          <div className="profile-section-card">
            <div className="profile-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="profile-section-title">
                <User size={18} style={{ color: '#67BEC3' }} />
                Thông tin cá nhân
              </h2>
              <button
                type="button"
                onClick={openEditModal}
                className="profile-btn-edit-inline"
                title="Chỉnh sửa địa chỉ & thông tin cá nhân"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            <div className="profile-data-list">
              <div className="profile-data-row">
                <span className="profile-data-label">Họ và tên:</span>
                <span className="profile-data-value">{profile.name || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Email liên hệ:</span>
                <span className="profile-data-value">{profile.email || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Số điện thoại:</span>
                <span className="profile-data-value">{profile.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Địa chỉ:</span>
                <span className="profile-data-value" style={{ color: profile.address ? '#0f172a' : '#94a3b8' }}>
                  {profile.address || 'Chưa cập nhật địa chỉ'}
                </span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Danh hiệu:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {Array.isArray(profile.badges) && profile.badges.length > 0 ? (
                    profile.badges.map((b, idx) => (
                      <span key={idx} className="profile-badge-tag">
                        <Sparkles size={11} style={{ color: '#d97706' }} />
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="profile-data-value">Thành viên tiêu chuẩn</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin tài khoản */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">
                <ShieldCheck size={18} style={{ color: '#286E74' }} />
                Thông tin tài khoản
              </h2>
            </div>

            <div className="profile-data-list">
              <div className="profile-data-row">
                <span className="profile-data-label">Email đăng nhập:</span>
                <span className="profile-data-value">{account.email || profile.email || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Vai trò tài khoản:</span>
                <span className="profile-data-value">
                  {profile.role === 'admin'
                    ? 'Quản trị viên'
                    : profile.role === 'owner'
                    ? 'Chủ thiết bị'
                    : 'Người thuê'}
                </span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Định danh eKYC:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isAccountVerified ? (
                    <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                      <CheckCircle2 size={13} />
                      Đã xác thực CCCD
                    </span>
                  ) : (
                    <>
                      <span
                        className="profile-badge-tag"
                        style={{
                          background: ekycRequestData?.status === 'pending' ? '#eff6ff' : ekycRequestData?.status === 'rejected' ? '#fff1f2' : '#fffbeb',
                          color: ekycRequestData?.status === 'pending' ? '#1d4ed8' : ekycRequestData?.status === 'rejected' ? '#be123c' : '#b45309',
                        }}
                      >
                        {ekycRequestData?.status === 'pending'
                          ? 'Đang xét duyệt'
                          : ekycRequestData?.status === 'rejected'
                          ? 'Bị từ chối'
                          : 'Chưa định danh'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEkycModalOpen(true)}
                        className="profile-btn-edit-inline"
                        style={{ backgroundColor: '#286E74', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                        title="Bấm để mở giao diện nộp đơn eKYC"
                      >
                        <ShieldCheck size={13} />
                        <span>{ekycRequestData?.status === 'pending' ? 'Xem đơn eKYC' : 'Nộp đơn eKYC'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Trạng thái:</span>
                <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                  <CheckCircle2 size={13} />
                  {account.isActive !== false ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
              </div>
              {(account.createdAt || profile.createdAt) && (
                <div className="profile-data-row">
                  <span className="profile-data-label">Ngày tham gia:</span>
                  <span className="profile-data-value">
                    <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {new Date(account.createdAt || profile.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Chỉnh sửa hồ sơ (Cập nhật địa chỉ) */}
        {isEditModalOpen && (
          <div className="profile-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
            <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <div className="profile-modal-title-wrap">
                  <div className="profile-modal-icon">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="profile-modal-title">Chỉnh sửa thông tin hồ sơ</h3>
                    <p className="profile-modal-subtitle">Cập nhật họ tên, số điện thoại và địa chỉ nhận thiết bị</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-modal-close-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {editError && (
                <div className="profile-modal-error">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="profile-modal-form">
                <div className="profile-modal-form-group">
                  <label className="profile-modal-label">Họ và tên</label>
                  <div className="profile-modal-input-wrap">
                    <User size={16} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      className="profile-modal-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Nhập họ và tên..."
                      required
                    />
                  </div>
                </div>

                <div className="profile-modal-form-group">
                  <label className="profile-modal-label">Số điện thoại</label>
                  <div className="profile-modal-input-wrap">
                    <Phone size={16} className="profile-modal-input-icon" />
                    <input
                      type="tel"
                      className="profile-modal-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>
                </div>

                <div className="profile-modal-form-group">
                  <label className="profile-modal-label">
                    <span>Địa chỉ liên hệ &amp; giao nhận thiết bị</span>
                    <span style={{ fontSize: '11px', color: '#286E74', background: '#e8f6f7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Quan trọng
                    </span>
                  </label>
                  <div className="profile-modal-input-wrap">
                    <MapPin size={16} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      className="profile-modal-input"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Ví dụ: 600, Long Tuyen, Binh Thuy, Can Tho..."
                    />
                  </div>
                  <span className="profile-modal-hint">
                    Địa chỉ này được lưu vào hồ sơ để tự động điền khi đặt thuê và hỗ trợ chủ thiết bị giao nhận máy.
                  </span>
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-modal-btn-cancel"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={savingProfile}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="profile-modal-btn-save"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <div className="profile-spinner-sm" style={{ width: 16, height: 16 }} />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nộp Hồ Sơ eKYC Xác Thực Danh Tính Renter */}
        <EkycSubmitModal
          isOpen={isEkycModalOpen}
          onClose={() => setIsEkycModalOpen(false)}
          user={profile}
          account={account}
          onOpenEditAddress={openEditModal}
          onSuccess={(newReq) => {
            setEkycRequestData(newReq);
            setFeedbackMsg({
              type: 'success',
              text: 'Gửi hồ sơ eKYC thành công! Quản trị viên sẽ sớm xét duyệt hồ sơ của bạn.',
            });
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />

        {/* Modal Nộp Hồ Sơ eKYC Nâng Cấp Owner (3 ảnh: CCCD 2 mặt + chân dung cầm CCCD) */}
        <OwnerEkycSubmitModal
          isOpen={isOwnerEkycModalOpen}
          onClose={() => setIsOwnerEkycModalOpen(false)}
          user={profile}
          account={account}
          onOpenEditAddress={openEditModal}
          onSuccess={(newReq) => {
            setOwnerEkycData((prev) => ({
              ...prev,
              request: newReq,
            }));
            setFeedbackMsg({
              type: 'success',
              text: 'Owner verification submitted successfully! Administrators will review your request shortly.',
            });
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      </div>
    </div>
  );
};

export default ProfilePage;

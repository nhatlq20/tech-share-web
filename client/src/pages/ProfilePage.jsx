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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { uploadAvatar } from '../services/uploadService.js';
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
  const { user: authUser, account: authAccount, token, isAuthenticated, logout, login, refreshProfile } = useAuth();

  const [userData, setUserData] = useState(authUser);
  const [accountData, setAccountData] = useState(authAccount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái upload avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100
  const [feedbackMsg, setFeedbackMsg] = useState(null);

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
                {profile.isVerified && (
                  <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                    <ShieldCheck size={14} />
                    eKYC Verified
                  </span>
                )}
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

        {/* 2 Cột chi tiết: Hồ sơ cá nhân & Tài khoản */}
        <div className="profile-details-grid">
          {/* Card 1: Thông tin cá nhân */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">
                <User size={18} style={{ color: '#67BEC3' }} />
                Thông tin cá nhân
              </h2>
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
                <span className="profile-data-value">{profile.address || 'Chưa cập nhật'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Mã giới thiệu:</span>
                <span className="profile-code-box">{profile.referralCode || 'Không có'}</span>
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
      </div>
    </div>
  );
};

export default ProfilePage;

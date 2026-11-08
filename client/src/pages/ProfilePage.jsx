import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
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
          text: 'Profile and address updated successfully!',
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        setEditError(res?.message || 'Unable to save changes.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setEditError(err.data?.message || err.message || 'Error updating profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    // If not authenticated, redirect to Login
    if (!isAuthenticated && !token) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Call API backend to fetch directly from `users` collection
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
          // Đồng bộ lại AuthContext & localStorage để Navbar và các màn hình khác nhận được trustScore & rating mới nhất
          login({
            token,
            user: res.user,
            account: res.account || accountData || authAccount,
          });
        }
      } catch (err) {
        console.error('Failed to load profile from users collection:', err);
        setError('Unable to sync latest data from server. Displaying local data.');
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
   * handleAvatarUpload – performance optimized flow:
   *   1. Validate file (type, size)
   *   2. Compress + resize via Canvas
   *   3. Direct upload browser → Cloudinary (XHR with progress)
   *   4. Send short URL to server to persist in DB (~100 bytes instead of ~MB)
   */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setFeedbackMsg({ type: 'error', text: 'Please select a valid image file (JPG, PNG, WEBP, GIF).' });
      return;
    }

    // Limit 20MB
    if (file.size > 20 * 1024 * 1024) {
      setFeedbackMsg({ type: 'error', text: 'Image file size must not exceed 20MB.' });
      return;
    }

    try {
      setUploadingAvatar(true);
      setUploadProgress(0);
      setFeedbackMsg(null);

      const { url: avatarUrl, compressedSize, savingsPct } = await uploadAvatar(file, {
        maxSize: 800,
        quality: 0.82,
        onProgress: (pct) => setUploadProgress(pct),
      });

      const res = await api.patch(
        '/users/avatar',
        { avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.success) {
        const newAvatar = res.avatar || avatarUrl;

        setUserData((prev) => ({ ...prev, avatar: newAvatar }));

        login({
          token,
          user: res.user ? res.user : { ...(userData || authUser), avatar: newAvatar },
          account: accountData || authAccount,
        });

        setFeedbackMsg({
          type: 'success',
          text: `Avatar updated successfully! (Compressed ${savingsPct}%, ${(compressedSize / 1024).toFixed(0)}KB)`,
        });
        setTimeout(() => setFeedbackMsg(null), 5000);
      } else {
        setFeedbackMsg({ type: 'error', text: res?.message || 'Unable to save avatar.' });
      }
    } catch (err) {
      console.error('[Avatar] Upload error:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to upload image. Please try again.',
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
              Loading profile information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Use data from users collection (priority on fresh server data)
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
        {/* Navigation back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Link to={ROUTES.HOME} className="profile-btn-action">
            <ArrowLeft size={16} />
            Back to Home
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

                {/* Camera button to change avatar */}
                <label
                  htmlFor="profile-avatar-input"
                  className="profile-avatar-upload-trigger"
                  title="Change avatar (Upload to Cloudinary)"
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
                {/* Submit eKYC button for Renter */}
                <button
                  type="button"
                  onClick={() => setIsEkycModalOpen(true)}
                  className={`profile-btn-action ${isAccountVerified ? 'profile-btn-verified' : 'profile-btn-ekyc'}`}
                  title={
                    isAccountVerified
                      ? 'Account identity verified via National ID'
                      : 'Verify identity (eKYC) to qualify for renting devices'
                  }
                >
                  <ShieldCheck size={15} />
                  <span>
                    {isAccountVerified
                      ? 'eKYC Verified'
                      : ekycRequestData?.status === 'pending'
                      ? 'eKYC Pending'
                      : ekycRequestData?.status === 'rejected'
                      ? 'Resubmit eKYC'
                      : 'Submit eKYC'}
                  </span>
                </button>

                {/* Upgrade to Owner button */}
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
                  title="Edit profile & address"
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
                  Log Out
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
                  {profile.role === 'admin' ? 'Administrator' : profile.role === 'owner' ? 'Device Owner' : 'Renter'}
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
                    title="Click to view pending eKYC review details"
                  >
                    <Clock size={14} />
                    eKYC Under Review
                  </span>
                ) : ekycRequestData?.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => setIsEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', cursor: 'pointer' }}
                    title="Application rejected - Click to resubmit"
                  >
                    <AlertCircle size={14} />
                    eKYC Rejected (Resubmit)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', cursor: 'pointer' }}
                    title="Renters must complete eKYC to rent equipment"
                  >
                    <AlertCircle size={14} />
                    Not Verified (Verify Now)
                  </button>
                )}

                {/* Owner eKYC badge status */}
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
                    title="Click to view pending Owner upgrade request"
                  >
                    <Clock size={14} />
                    Owner Under Review
                  </span>
                ) : ownerEkycData?.request?.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => setIsOwnerEkycModalOpen(true)}
                    className="profile-badge-tag"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', cursor: 'pointer' }}
                    title="Owner verification rejected - Click to resubmit"
                  >
                    <AlertCircle size={14} />
                    Owner eKYC Rejected (Resubmit)
                  </button>
                ) : null}
              </div>

              <div className="profile-user-meta-sub">
                <div className="profile-meta-item">
                  <Mail size={14} />
                  <span>{profile.email || account.email || 'Email not provided'}</span>
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
          {/* Trust Score */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Award size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Trust Score</span>
              <span className="profile-kpi-value">{profile.trustScore ?? profile.trust?.score ?? 100} / 100</span>
              <span className="profile-kpi-sub">Maximum trust rating</span>
            </div>
          </div>

          {/* Rating */}
          <div className="profile-kpi-card">
            <div className="profile-kpi-icon-box" style={{ background: '#fef9c3', color: '#ca8a04' }}>
              <Star size={22} />
            </div>
            <div className="profile-kpi-info">
              <span className="profile-kpi-label">Average Rating</span>
              <span className="profile-kpi-value">{profile.rating ?? 5.0} ★</span>
              <span className="profile-kpi-sub">{profile.totalReviews ?? 0} reviews</span>
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

        {/* 2 Column Details: Personal Information & Account */}
        <div className="profile-details-grid">
          {/* Card 1: Personal Information */}
          <div className="profile-section-card">
            <div className="profile-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="profile-section-title">
                <User size={18} style={{ color: '#67BEC3' }} />
                Personal Information
              </h2>
              <button
                type="button"
                onClick={openEditModal}
                className="profile-btn-edit-inline"
                title="Edit address & personal information"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            <div className="profile-data-list">
              <div className="profile-data-row">
                <span className="profile-data-label">Full Name:</span>
                <span className="profile-data-value">{profile.name || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Contact Email:</span>
                <span className="profile-data-value">{profile.email || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Phone Number:</span>
                <span className="profile-data-value">{profile.phone || 'Not updated'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Address:</span>
                <span className="profile-data-value" style={{ color: profile.address ? '#0f172a' : '#94a3b8' }}>
                  {profile.address || 'Address not provided'}
                </span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Badges:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {Array.isArray(profile.badges) && profile.badges.length > 0 ? (
                    profile.badges.map((b, idx) => (
                      <span key={idx} className="profile-badge-tag">
                        <Sparkles size={11} style={{ color: '#d97706' }} />
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="profile-data-value">Standard Member</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Account Information */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">
                <ShieldCheck size={18} style={{ color: '#286E74' }} />
                Account Information
              </h2>
            </div>

            <div className="profile-data-list">
              <div className="profile-data-row">
                <span className="profile-data-label">Login Email:</span>
                <span className="profile-data-value">{account.email || profile.email || '---'}</span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Account Role:</span>
                <span className="profile-data-value">
                  {profile.role === 'admin'
                    ? 'Administrator'
                    : profile.role === 'owner'
                    ? 'Device Owner'
                    : 'Renter'}
                </span>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">eKYC Verification:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isAccountVerified ? (
                    <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                      <CheckCircle2 size={13} />
                      National ID Verified
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
                          ? 'Under Review'
                          : ekycRequestData?.status === 'rejected'
                          ? 'Rejected'
                          : 'Not Verified'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEkycModalOpen(true)}
                        className="profile-btn-edit-inline"
                        style={{ backgroundColor: '#286E74', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                        title="Click to open eKYC submission"
                      >
                        <ShieldCheck size={13} />
                        <span>{ekycRequestData?.status === 'pending' ? 'View eKYC' : 'Submit eKYC'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="profile-data-row">
                <span className="profile-data-label">Status:</span>
                <span className="profile-badge-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                  <CheckCircle2 size={13} />
                  {account.isActive !== false ? 'Active' : 'Suspended'}
                </span>
              </div>
              {(account.createdAt || profile.createdAt) && (
                <div className="profile-data-row">
                  <span className="profile-data-label">Member Since:</span>
                  <span className="profile-data-value">
                    <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {new Date(account.createdAt || profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Edit Profile (Update Address & Contact) */}
        {isEditModalOpen && (
          <div className="profile-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
            <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <div className="profile-modal-title-wrap">
                  <div className="profile-modal-icon">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="profile-modal-title">Edit Profile Information</h3>
                    <p className="profile-modal-subtitle">Update your full name, phone number, and delivery address</p>
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
                  <label className="profile-modal-label">Full Name</label>
                  <div className="profile-modal-input-wrap">
                    <User size={16} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      className="profile-modal-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter full name..."
                      required
                    />
                  </div>
                </div>

                <div className="profile-modal-form-group">
                  <label className="profile-modal-label">Phone Number</label>
                  <div className="profile-modal-input-wrap">
                    <Phone size={16} className="profile-modal-input-icon" />
                    <input
                      type="tel"
                      className="profile-modal-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Enter phone number..."
                    />
                  </div>
                </div>

                <div className="profile-modal-form-group">
                  <label className="profile-modal-label">
                    <span>Contact &amp; Delivery Address</span>
                    <span style={{ fontSize: '11px', color: '#286E74', background: '#e8f6f7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Important
                    </span>
                  </label>
                  <div className="profile-modal-input-wrap">
                    <MapPin size={16} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      className="profile-modal-input"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="e.g. 600 Nguyen Van Cu, Ninh Kieu, Can Tho..."
                    />
                  </div>
                  <span className="profile-modal-hint">
                    This address is saved to your profile for automatic autofill during checkout and delivery coordination.
                  </span>
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-modal-btn-cancel"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-modal-btn-save"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <div className="profile-spinner-sm" style={{ width: 16, height: 16 }} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Submit eKYC Renter Verification */}
        {isEkycModalOpen && (
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
                text: 'eKYC application submitted successfully! Administrators will review your request shortly.',
              });
              setTimeout(() => setFeedbackMsg(null), 4000);
            }}
          />
        )}

        {/* Modal Submit eKYC Owner Upgrade */}
        {isOwnerEkycModalOpen && (
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
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

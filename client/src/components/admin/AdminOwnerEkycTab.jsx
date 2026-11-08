import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  ZoomIn,
  CreditCard,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Mail,
  Phone,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  getAdminOwnerEkycList,
  approveAdminOwnerEkyc,
  rejectAdminOwnerEkyc,
} from '../../services/ownerEkycService.js';
import './AdminOwnerEkycTab.css';

const COMMON_REJECT_REASONS = [
  'Portrait photo holding ID card is blurry, overexposed, or face is obscured.',
  'ID card information held in photo does not match the submitted ID card photos.',
  'ID card photo has cropped corners or name and ID number are not clearly legible.',
  'Selfie holding ID card shows signs of digital editing or is not authentic.',
];

export const AdminOwnerEkycTab = ({ onStatusChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Lightbox for large image viewing
  const [lightbox, setLightbox] = useState(null); // { url, title }

  // Rejection modal state
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState(COMMON_REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch requests from API
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminOwnerEkycList({ status: 'all' });
      const items = Array.isArray(res?.data) ? res.data : [];
      setRequests(items);
    } catch (err) {
      console.warn('Failed to fetch Owner eKYC requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Status counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (r.fullName || r.name || '').toLowerCase();
    const email = (r.email || '').toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const idCard = (r.idCardNumber || '').toLowerCase();
    return (
      name.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      idCard.includes(term)
    );
  });

  // Action: Approve
  const handleApprove = async (id, name) => {
    try {
      setActionLoadingId(id);
      await approveAdminOwnerEkyc(id);

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'approved' } : r))
      );
      setToast({
        message: `Successfully approved and upgraded "${name}" to Device Owner!`,
        type: 'success',
      });
      if (typeof onStatusChange === 'function') {
        onStatusChange({ action: 'approve', requestId: id });
      }
    } catch (err) {
      setToast({
        message: `Failed to approve Owner upgrade for "${name}".`,
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Reject
  const handleOpenRejectModal = (req) => {
    setRejectModalReq(req);
    setRejectReason(COMMON_REJECT_REASONS[0]);
    setCustomRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    const finalReason = customRejectReason.trim() || rejectReason;

    try {
      setActionLoadingId(rejectModalReq._id);
      await rejectAdminOwnerEkyc(rejectModalReq._id, finalReason);

      setRequests((prev) =>
        prev.map((r) =>
          r._id === rejectModalReq._id
            ? { ...r, status: 'rejected', rejectReason: finalReason }
            : r
        )
      );
      setToast({
        message: `Rejected Owner application for "${rejectModalReq.fullName || rejectModalReq.name}".`,
        type: 'info',
      });
      if (typeof onStatusChange === 'function') {
        onStatusChange({ action: 'reject', requestId: rejectModalReq._id });
      }
      setRejectModalReq(null);
    } catch {
      setToast({
        message: 'Error while rejecting application.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-owner-ekyc-wrap">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 11000,
            padding: '0.875rem 1.25rem',
            borderRadius: '0.75rem',
            background:
              toast.type === 'success'
                ? '#065f46'
                : toast.type === 'error'
                ? '#991b1b'
                : '#1e293b',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Stats */}
      <div className="admin-owner-ekyc-header">
        <div className="admin-owner-ekyc-title-box">
          <div className="admin-owner-ekyc-title-icon">
            <Crown size={24} />
          </div>
          <div>
            <h2 className="admin-owner-ekyc-title">Owner Upgrade Verification (3 Photos)</h2>
            <p className="admin-owner-ekyc-desc">
              Review and authenticate Renter to Device Owner upgrade applications via 2-sided ID card & selfie holding ID card.
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="admin-owner-ekyc-stats-row">
          <button
            type="button"
            className={`admin-owner-stat-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span>All</span>
            <span className="admin-owner-stat-count">{requests.length}</span>
          </button>
          <button
            type="button"
            className={`admin-owner-stat-pill ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <span>Pending</span>
            <span className="admin-owner-stat-count">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`admin-owner-stat-pill ${statusFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            <span>Approved</span>
            <span className="admin-owner-stat-count">{approvedCount}</span>
          </button>
          <button
            type="button"
            className={`admin-owner-stat-pill ${statusFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('rejected')}
          >
            <span>Rejected</span>
            <span className="admin-owner-stat-count">{rejectedCount}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '0.55rem 0.875rem',
          maxWidth: '460px',
        }}
      >
        <Search size={17} color="#64748b" />
        <input
          type="text"
          placeholder="Search by name, email, phone or ID number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '0.875rem',
            width: '100%',
            color: '#0f172a',
          }}
        />
      </div>

      {/* Content List */}
      {loading ? (
        <div className="admin-owner-empty-state">
          <Loader2 size={32} className="animate-spin" style={{ color: '#67BEC3' }} />
          <span>Loading Owner upgrade applications...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="admin-owner-empty-state">
          <ShieldCheck size={44} color="#94a3b8" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            {statusFilter === 'pending'
              ? 'No pending Owner verification requests at this time'
              : 'No matching applications found'}
          </h3>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            Submitted upgrade applications from renters will appear here for review.
          </p>
        </div>
      ) : (
        <div className="admin-owner-requests-list">
          {filteredRequests.map((req) => {
            const isItemPending = req.status === 'pending';
            const isItemApproved = req.status === 'approved';
            const isItemRejected = req.status === 'rejected';

            return (
              <div key={req._id} className={`admin-owner-card status-${req.status}`}>
                {/* Top Info */}
                <div className="admin-owner-card-top">
                  <div className="admin-owner-card-user">
                    <img
                      src={
                        req.avatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
                      }
                      alt={req.fullName}
                      className="admin-owner-card-avatar"
                    />
                    <div className="admin-owner-card-user-info">
                      <h4 className="admin-owner-card-name">
                        {req.fullName || req.name}
                        {req.userTrust?.isVerified && (
                          <span
                            title="Account has completed Renter verification"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <ShieldCheck size={12} /> Renter Verified
                          </span>
                        )}
                      </h4>
                      <div className="admin-owner-card-meta">
                        <span className="admin-owner-card-meta-item">
                          <Mail size={13} /> {req.email || 'No email provided'}
                        </span>
                        <span className="admin-owner-card-meta-item">
                          <Phone size={13} /> {req.phone || 'No phone provided'}
                        </span>
                        <span className="admin-owner-card-meta-item">
                          <MapPin size={13} /> {req.address || 'No address provided'}
                        </span>
                        {req.idCardNumber && (
                          <span className="admin-owner-card-meta-item">
                            <CreditCard size={13} /> ID Card: <strong>{req.idCardNumber}</strong>
                          </span>
                        )}
                        <span className="admin-owner-card-meta-item">
                          <Calendar size={13} /> Submitted:{' '}
                          {req.createdAt ? new Date(req.createdAt).toLocaleString('en-US') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`admin-owner-badge ${req.status}`}>
                    {isItemPending && (
                      <>
                        <AlertTriangle size={13} /> Pending Review
                      </>
                    )}
                    {isItemApproved && (
                      <>
                        <CheckCircle size={13} /> Owner Approved
                      </>
                    )}
                    {isItemRejected && (
                      <>
                        <XCircle size={13} /> Rejected
                      </>
                    )}
                  </div>
                </div>

                {/* 3 Images Grid */}
                <div className="admin-owner-3images-grid">
                  {/* Image 1: Front */}
                  <div
                    className="admin-owner-img-box"
                    onClick={() =>
                      setLightbox({
                        url: req.idCardFrontUrl,
                        title: `Front of ID Card - ${req.fullName || req.name}`,
                      })
                    }
                  >
                    <span className="admin-owner-img-label">
                      <CreditCard size={12} />
                      1. Front of ID Card
                    </span>
                    <img
                      src={req.idCardFrontUrl}
                      alt="Front of ID Card"
                      className="admin-owner-img"
                    />
                    <div className="admin-owner-img-zoom-hint">
                      <ZoomIn size={18} /> Enlarge
                    </div>
                  </div>

                  {/* Image 2: Back */}
                  <div
                    className="admin-owner-img-box"
                    onClick={() =>
                      setLightbox({
                        url: req.idCardBackUrl,
                        title: `Back of ID Card - ${req.fullName || req.name}`,
                      })
                    }
                  >
                    <span className="admin-owner-img-label">
                      <CreditCard size={12} />
                      2. Back of ID Card
                    </span>
                    <img src={req.idCardBackUrl} alt="Back of ID Card" className="admin-owner-img" />
                    <div className="admin-owner-img-zoom-hint">
                      <ZoomIn size={18} /> Enlarge
                    </div>
                  </div>

                  {/* Image 3: Selfie holding ID */}
                  <div
                    className="admin-owner-img-box"
                    onClick={() =>
                      setLightbox({
                        url: req.idCardHoldingUrl,
                        title: `Selfie holding ID Card - ${req.fullName || req.name}`,
                      })
                    }
                  >
                    <span className="admin-owner-img-label highlight">
                      <Camera size={12} />
                      3. Selfie with ID Card ⭐
                    </span>
                    <img
                      src={req.idCardHoldingUrl}
                      alt="Selfie holding ID Card"
                      className="admin-owner-img"
                    />
                    <div className="admin-owner-img-zoom-hint">
                      <ZoomIn size={18} /> Enlarge
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="admin-owner-card-footer">
                  <div>
                    {isItemRejected && (
                      <div className="admin-owner-rejection-note">
                        <AlertCircle size={15} />
                        <span>
                          <strong>Rejection reason:</strong> {req.rejectReason}
                        </span>
                      </div>
                    )}
                    {isItemApproved && (
                      <div className="admin-owner-approval-note">
                        <CheckCircle2 size={15} />
                        <span>
                          Account granted <strong>Device Owner</strong> privileges on{' '}
                          {req.reviewedAt
                            ? new Date(req.reviewedAt).toLocaleString('en-US')
                            : 'system'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending */}
                  {isItemPending && (
                    <div className="admin-owner-actions-wrap">
                      <button
                        type="button"
                        className="admin-owner-btn-reject"
                        onClick={() => handleOpenRejectModal(req)}
                        disabled={actionLoadingId === req._id}
                      >
                        <XCircle size={15} />
                        Reject
                      </button>
                      <button
                        type="button"
                        className="admin-owner-btn-approve"
                        onClick={() => handleApprove(req._id, req.fullName || req.name)}
                        disabled={actionLoadingId === req._id}
                      >
                        {actionLoadingId === req._id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Crown size={15} />
                        )}
                        Approve as Owner
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="admin-owner-lightbox-backdrop" onClick={() => setLightbox(null)}>
          <div className="admin-owner-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-owner-lightbox-close"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>
            <img src={lightbox.url} alt={lightbox.title} className="admin-owner-lightbox-img" />
            <div className="admin-owner-lightbox-caption">{lightbox.title}</div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && (
        <div
          className="admin-owner-reject-modal-backdrop"
          onClick={() => setRejectModalReq(null)}
        >
          <div className="admin-owner-reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 className="admin-owner-reject-title">
                <XCircle size={20} color="#dc2626" />
                Reject Owner Upgrade Application
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Select a reason for rejecting the application of{' '}
              <strong>{rejectModalReq.fullName || rejectModalReq.name}</strong>. The user will be notified and can retake clearer photos to resubmit.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {COMMON_REJECT_REASONS.map((r, idx) => (
                <div
                  key={idx}
                  className={`admin-owner-reason-item ${
                    rejectReason === r && !customRejectReason ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setRejectReason(r);
                    setCustomRejectReason('');
                  }}
                >
                  <input
                    type="radio"
                    name="ownerRejectReason"
                    checked={rejectReason === r && !customRejectReason}
                    onChange={() => {}}
                    style={{ marginTop: '0.15rem' }}
                  />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '0.35rem',
                }}
              >
                Or provide custom reason:
              </label>
              <textarea
                className="admin-owner-reject-textarea"
                placeholder="Specify required corrections or photo guidelines..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
              />
            </div>

            <div className="admin-owner-reject-footer">
              <button
                type="button"
                className="admin-owner-btn-reject"
                style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}
                onClick={() => setRejectModalReq(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-owner-btn-approve"
                style={{ background: '#dc2626' }}
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalReq._id}
              >
                {actionLoadingId === rejectModalReq._id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <XCircle size={15} />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOwnerEkycTab;

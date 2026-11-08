/**
 * TechShare Admin Portal - Owner Upgrade Verification Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  let targetRow = null;

  // 1. Search filter
  const searchInput = document.getElementById('ownerEkycSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterRows();
    });
  }

  // 2. Status tab filter
  let currentStatus = 'all';
  const statusTabs = document.querySelectorAll('.btn-owner-status-tab');
  statusTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      statusTabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#64748B';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#E8F6F7';
      tab.style.color = '#286E74';
      tab.style.fontWeight = '700';

      currentStatus = tab.getAttribute('data-status') || 'all';
      filterRows();
    });
  });

  function filterRows() {
    const term = (searchInput ? searchInput.value.trim().toLowerCase() : '');
    const rows = document.querySelectorAll('.owner-ekyc-row');

    rows.forEach(function(row) {
      const name = (row.getAttribute('data-name') || '').toLowerCase();
      const email = (row.getAttribute('data-email') || '').toLowerCase();
      const phone = (row.getAttribute('data-phone') || '').toLowerCase();
      const cccd = (row.getAttribute('data-cccd') || '').toLowerCase();
      const status = row.getAttribute('data-status') || 'pending';

      const matchSearch = !term || name.includes(term) || email.includes(term) || phone.includes(term) || cccd.includes(term);
      const matchStatus = currentStatus === 'all' || status === currentStatus;

      row.style.display = matchSearch && matchStatus ? '' : 'none';
    });
  }

  // Helper: Switch between pending (actionable) and reviewed (read-only) mode
  function updateOwnerModalViewMode(status, reason) {
    const rejectSec = document.getElementById('modalRejectSection');
    const actionsBox = document.getElementById('ownerPendingActions');
    const approvedNotice = document.getElementById('ownerApprovedNotice');
    const rejectedNotice = document.getElementById('ownerRejectedNotice');
    const reasonText = document.getElementById('ownerRejectedReasonText');
    const badgeBox = document.getElementById('modalCurrentStatusBadge');
    const rejectInput = document.getElementById('modalRejectReason');
    const rejectError = document.getElementById('ownerRejectError');

    // Reset error validation styling
    if (rejectInput) {
      rejectInput.style.borderColor = '#CBD5E1';
      rejectInput.style.backgroundColor = '#FFFFFF';
      rejectInput.style.boxShadow = 'none';
      rejectInput.value = '';
    }
    if (rejectError) rejectError.style.display = 'none';

    if (badgeBox) {
      if (status === 'approved') {
        badgeBox.innerHTML = '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A; font-weight: 700;">✓ Đã duyệt thành Chủ thiết bị (Owner)</span>';
      } else if (status === 'rejected') {
        badgeBox.innerHTML = '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626; font-weight: 700;">✕ Bị từ chối nâng cấp</span>';
      } else {
        badgeBox.innerHTML = '<span class="admin-pill-badge" style="background-color: #FEF3C7; color: #D97706; font-weight: 700;">⏱ Chờ ban quản trị xét duyệt</span>';
      }
    }

    if (status === 'pending') {
      if (rejectSec) rejectSec.style.display = 'block';
      if (actionsBox) actionsBox.style.display = 'flex';
      if (approvedNotice) approvedNotice.style.display = 'none';
      if (rejectedNotice) rejectedNotice.style.display = 'none';
    } else if (status === 'approved') {
      if (rejectSec) rejectSec.style.display = 'none';
      if (actionsBox) actionsBox.style.display = 'none';
      if (approvedNotice) approvedNotice.style.display = 'block';
      if (rejectedNotice) rejectedNotice.style.display = 'none';
    } else if (status === 'rejected') {
      if (rejectSec) rejectSec.style.display = 'none';
      if (actionsBox) actionsBox.style.display = 'none';
      if (approvedNotice) approvedNotice.style.display = 'none';
      if (rejectedNotice) rejectedNotice.style.display = 'block';
      if (reasonText) reasonText.textContent = reason || 'Không có lý do chi tiết';
    }
  }

  // Real-time input listener to clear validation error
  const rejectInputEl = document.getElementById('modalRejectReason');
  const rejectErrorEl = document.getElementById('ownerRejectError');
  if (rejectInputEl) {
    rejectInputEl.addEventListener('input', function() {
      if (this.value.trim().length > 0) {
        this.style.borderColor = '#CBD5E1';
        this.style.backgroundColor = '#FFFFFF';
        this.style.boxShadow = 'none';
        if (rejectErrorEl) rejectErrorEl.style.display = 'none';
      }
    });
  }

  // 3. Inspect Modal Open
  document.querySelectorAll('.btn-inspect-owner').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.owner-ekyc-row');
      if (!row) return;
      targetRow = row;

      const name = row.getAttribute('data-name') || 'Người dùng TechShare';
      const email = row.getAttribute('data-email') || 'user@techshare.vn';
      const phone = row.getAttribute('data-phone') || 'Chưa có SĐT';
      const address = row.getAttribute('data-address') || 'Chưa cập nhật';
      const cccd = row.getAttribute('data-cccd') || 'Chưa có số CCCD';
      const status = row.getAttribute('data-status') || 'pending';
      const reason = row.getAttribute('data-reason') || '';
      const front = row.getAttribute('data-front') || '';
      const back = row.getAttribute('data-back') || '';
      const holding = row.getAttribute('data-holding') || '';

      document.getElementById('modalOwnerName').textContent = name;
      document.getElementById('modalOwnerEmail').textContent = email;
      document.getElementById('modalOwnerPhone').textContent = phone;
      document.getElementById('modalOwnerAddress').textContent = address;
      document.getElementById('modalOwnerCccd').textContent = cccd;

      document.getElementById('modalImgFront').src = front || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500';
      document.getElementById('modalImgBack').src = back || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500';
      document.getElementById('modalImgHolding').src = holding || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500';

      const alertEl = document.getElementById('modalStatusAlert');
      if (alertEl) alertEl.style.display = 'none';

      // Apply Read-Only or Actionable Mode
      updateOwnerModalViewMode(status, reason);

      document.getElementById('ownerEkycModal').style.display = 'flex';
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  });

  // 4. Close Modal
  document.querySelectorAll('.btn-close-owner-modal, #ownerEkycModal').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-owner-modal') || el.closest('.btn-close-owner-modal')) {
        document.getElementById('ownerEkycModal').style.display = 'none';
      }
    });
  });

  // 5. Image Zoom Handler
  document.querySelectorAll('.zoomable-wrapper').forEach(function(wrap) {
    wrap.addEventListener('click', function() {
      const targetImgId = wrap.getAttribute('data-target');
      const targetImg = document.getElementById(targetImgId);
      if (!targetImg || !targetImg.src) return;

      const zoomImg = document.getElementById('zoomModalImg');
      if (zoomImg) zoomImg.src = targetImg.src;

      const zoomModal = document.getElementById('imageZoomModal');
      if (zoomModal) {
        zoomModal.style.display = 'flex';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
    });
  });

  // 6. Action: Approve or Reject
  async function handleOwnerAction(action) {
    if (!targetRow) return;
    const reqId = targetRow.getAttribute('data-id');
    if (!reqId) return;

    let reason = '';
    if (action === 'reject') {
      const reasonInput = document.getElementById('modalRejectReason');
      const reasonError = document.getElementById('ownerRejectError');
      reason = reasonInput ? reasonInput.value.trim() : '';

      if (!reason) {
        if (reasonInput) {
          reasonInput.style.borderColor = '#EF4444';
          reasonInput.style.backgroundColor = '#FEF2F2';
          reasonInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
          reasonInput.focus();
        }
        if (reasonError) {
          reasonError.style.display = 'flex';
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }
        return;
      }
      if (reasonError) reasonError.style.display = 'none';
    }

    const btnApprove = document.getElementById('btnApproveOwner');
    const btnReject = document.getElementById('btnRejectOwner');
    if (btnApprove) {
      btnApprove.disabled = true;
      if (action === 'approve') btnApprove.innerHTML = '<span>Đang phê duyệt...</span>';
    }
    if (btnReject) {
      btnReject.disabled = true;
      if (action === 'reject') btnReject.innerHTML = '<span>Đang từ chối...</span>';
    }

    const alertEl = document.getElementById('modalStatusAlert');
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#F1F5F9';
      alertEl.style.color = '#334155';
      alertEl.textContent = 'Đang xử lý cập nhật trạng thái...';
    }

    try {
      const res = await fetch(`/api/admin/owner-ekyc/${reqId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update table row status and button label
        targetRow.setAttribute('data-status', newStatus);
        targetRow.setAttribute('data-reason', reason);

        const statusCell = targetRow.querySelector('.owner-status-cell');
        if (statusCell) {
          statusCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Đã duyệt (Owner)</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Bị từ chối</span>';
        }

        const btnLabel = targetRow.querySelector('.btn-inspect-owner-label');
        if (btnLabel) btnLabel.textContent = 'Xem chi tiết';

        // Lock modal to read-only view
        updateOwnerModalViewMode(newStatus, reason);

        if (window.showAdminToast) {
          window.showAdminToast(
            'Thành công',
            action === 'approve'
              ? 'Đã phê duyệt hồ sơ và nâng cấp quyền thành Chủ thiết bị (Owner) thành công!'
              : 'Đã từ chối đơn nâng cấp Owner.',
            'success'
          );
        }

        if (alertEl) alertEl.style.display = 'none';
      } else {
        throw new Error(data.message || 'Thao tác không thành công.');
      }
    } catch (err) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#FEF2F2';
        alertEl.style.color = '#DC2626';
        alertEl.textContent = 'Lỗi: ' + err.message;
      }
      if (window.showAdminToast) {
        window.showAdminToast('Lỗi thao tác', err.message, 'error');
      }
    } finally {
      if (btnApprove) {
        btnApprove.disabled = false;
        btnApprove.innerHTML = '<i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i><span>Phê duyệt lên Owner 🎉</span>';
      }
      if (btnReject) {
        btnReject.disabled = false;
        btnReject.innerHTML = '<i data-lucide="x-circle" style="width: 14px; height: 14px;"></i><span>Từ chối đơn</span>';
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  const btnApprove = document.getElementById('btnApproveOwner');
  const btnReject = document.getElementById('btnRejectOwner');
  if (btnApprove) btnApprove.addEventListener('click', () => handleOwnerAction('approve'));
  if (btnReject) btnReject.addEventListener('click', () => handleOwnerAction('reject'));
});

/**
 * TechShare Admin Portal - Renter eKYC Verification Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  let targetEkycRow = null;

  // 1. Search Filter
  const searchInput = document.getElementById('renterEkycSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterRenterRows();
    });
  }

  // 2. Status Tab Filter
  let currentStatus = 'all';
  const statusTabs = document.querySelectorAll('.btn-renter-status-tab');
  statusTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      statusTabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#64748B';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#ECFDF5';
      tab.style.color = '#166534';
      tab.style.fontWeight = '700';

      currentStatus = tab.getAttribute('data-status') || 'all';
      filterRenterRows();
    });
  });

  function filterRenterRows() {
    const term = (searchInput ? searchInput.value.trim().toLowerCase() : '');
    const rows = document.querySelectorAll('.ekyc-row');

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
  function updateRenterModalViewMode(status, reason) {
    const rejectSec = document.getElementById('renterRejectSection');
    const actionsBox = document.getElementById('renterPendingActions');
    const approvedNotice = document.getElementById('renterApprovedNotice');
    const rejectedNotice = document.getElementById('renterRejectedNotice');
    const reasonText = document.getElementById('renterRejectedReasonText');
    const badgeBox = document.getElementById('renterCurrentStatusBadge');
    const reasonInput = document.getElementById('renterRejectReasonInput');
    const reasonError = document.getElementById('renterRejectError');

    // Reset error styling
    if (reasonInput) {
      reasonInput.style.borderColor = '#CBD5E1';
      reasonInput.style.backgroundColor = '#FFFFFF';
      reasonInput.style.boxShadow = 'none';
      reasonInput.value = '';
    }
    if (reasonError) reasonError.style.display = 'none';

    if (badgeBox) {
      if (status === 'approved') {
        badgeBox.innerHTML = '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A; font-weight: 700;">✓ Đã xác minh eKYC</span>';
      } else if (status === 'rejected') {
        badgeBox.innerHTML = '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626; font-weight: 700;">✕ Bị từ chối eKYC</span>';
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
  const renterReasonInputEl = document.getElementById('renterRejectReasonInput');
  const renterReasonErrorEl = document.getElementById('renterRejectError');
  if (renterReasonInputEl) {
    renterReasonInputEl.addEventListener('input', function() {
      if (this.value.trim().length > 0) {
        this.style.borderColor = '#CBD5E1';
        this.style.backgroundColor = '#FFFFFF';
        this.style.boxShadow = 'none';
        if (renterReasonErrorEl) renterReasonErrorEl.style.display = 'none';
      }
    });
  }

  // 3. Inspect Modal Open
  document.querySelectorAll('.btn-inspect-ekyc').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.ekyc-row');
      if (!row) return;
      targetEkycRow = row;

      const name = row.getAttribute('data-name') || 'Người dùng TechShare';
      const cccd = row.getAttribute('data-cccd') || 'Chưa có số CCCD';
      const phone = row.getAttribute('data-phone') || 'Chưa có SĐT';
      const email = row.getAttribute('data-email') || 'user@techshare.vn';
      const addr = row.getAttribute('data-address') || 'Chưa cập nhật';
      const status = row.getAttribute('data-status') || 'pending';
      const reason = row.getAttribute('data-reason') || '';
      const front = row.getAttribute('data-front') || '';
      const back = row.getAttribute('data-back') || '';

      document.getElementById('ekycModalName').textContent = name;
      document.getElementById('ekycModalCccd').textContent = cccd;
      document.getElementById('ekycModalPhone').textContent = phone;
      document.getElementById('ekycModalEmail').textContent = email;
      document.getElementById('ekycModalAddr').textContent = addr;

      document.getElementById('ekycImgFront').src = front || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500';
      document.getElementById('ekycImgBack').src = back || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500';

      // Apply Read-Only or Actionable Mode
      updateRenterModalViewMode(status, reason);

      document.getElementById('ekycModal').style.display = 'flex';
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  });

  // 4. Close Modal
  document.querySelectorAll('.btn-close-modal, #ekycModal').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal') || el.closest('.btn-close-modal')) {
        document.getElementById('ekycModal').style.display = 'none';
      }
    });
  });

  // 5. Image Zoom Handler for Renter
  document.querySelectorAll('.renter-zoom-wrap').forEach(function(wrap) {
    wrap.addEventListener('click', function() {
      const targetImgId = wrap.getAttribute('data-target');
      const targetImg = document.getElementById(targetImgId);
      if (!targetImg || !targetImg.src) return;

      const zoomImg = document.getElementById('renterZoomModalImg');
      if (zoomImg) zoomImg.src = targetImg.src;

      const zoomModal = document.getElementById('renterImageZoomModal');
      if (zoomModal) {
        zoomModal.style.display = 'flex';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
    });
  });

  // 6. Action: Approve or Reject Renter eKYC
  async function handleEkycAction(action) {
    if (!targetEkycRow) return;
    const reqId = targetEkycRow.getAttribute('data-id');
    const endpoint = `/api/admin/ekyc/${reqId}/${action}`;

    let reason = '';
    if (action === 'reject') {
      const reasonInput = document.getElementById('renterRejectReasonInput');
      const reasonError = document.getElementById('renterRejectError');
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

    const btnApprove = document.getElementById('btnApproveEkyc');
    const btnReject = document.getElementById('btnRejectEkyc');
    if (btnApprove) {
      btnApprove.disabled = true;
      if (action === 'approve') btnApprove.innerHTML = '<span>Đang xác thực...</span>';
    }
    if (btnReject) {
      btnReject.disabled = true;
      if (action === 'reject') btnReject.innerHTML = '<span>Đang từ chối...</span>';
    }

    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update table row attributes
        targetEkycRow.setAttribute('data-status', newStatus);
        targetEkycRow.setAttribute('data-reason', reason);

        const statusCell = targetEkycRow.querySelector('.ekyc-status-cell');
        if (statusCell) {
          statusCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Đã xác minh</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Bị từ chối</span>';
        }

        const btnLabel = targetEkycRow.querySelector('.btn-inspect-ekyc-label');
        if (btnLabel) btnLabel.textContent = 'Xem chi tiết';

        // Lock modal to read-only mode
        updateRenterModalViewMode(newStatus, reason);

        if (window.showAdminToast) {
          window.showAdminToast(
            'Thành công',
            action === 'approve'
              ? 'Đã xác thực eKYC Người thuê thành công (+20 điểm tín nhiệm)!'
              : 'Đã từ chối hồ sơ eKYC.',
            'success'
          );
        }
      } else {
        if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể cập nhật hồ sơ eKYC.', 'error');
      }
    } catch (err) {
      if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
    } finally {
      if (btnApprove) {
        btnApprove.disabled = false;
        btnApprove.textContent = 'Xác nhận eKYC hợp lệ ✓';
      }
      if (btnReject) {
        btnReject.disabled = false;
        btnReject.textContent = 'Từ chối eKYC';
      }
    }
  }

  const btnApprove = document.getElementById('btnApproveEkyc');
  const btnReject = document.getElementById('btnRejectEkyc');
  if (btnApprove) btnApprove.addEventListener('click', () => handleEkycAction('approve'));
  if (btnReject) btnReject.addEventListener('click', () => handleEkycAction('reject'));

  const requestedId = new URLSearchParams(window.location.search).get('id');
  if (requestedId) {
    const row = Array.from(document.querySelectorAll('.ekyc-row')).find((item) => item.dataset.id === requestedId);
    row?.querySelector('.btn-inspect-ekyc')?.click();
  }
});

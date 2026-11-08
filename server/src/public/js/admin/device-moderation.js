/**
 * TechShare Admin Portal - Device Moderation Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('deviceSearchInput');
  const catSelect = document.getElementById('deviceCategoryFilter');
  const statusTabs = document.querySelectorAll('.btn-device-status-tab');
  const rows = document.querySelectorAll('.device-row');

  let activeStatus = 'all';

  function applyFilters() {
    const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = catSelect ? catSelect.value : 'all';

    rows.forEach(function(row) {
      const name = row.getAttribute('data-name') || '';
      const brand = row.getAttribute('data-brand') || '';
      const category = row.getAttribute('data-category') || '';
      const status = row.getAttribute('data-status') || '';
      const owner = row.getAttribute('data-owner') || '';

      const matchSearch = !term || name.includes(term) || brand.includes(term) || owner.includes(term);
      const matchCat = cat === 'all' || category === cat;
      const matchStatus = activeStatus === 'all' || status === activeStatus;

      row.style.display = (matchSearch && matchCat && matchStatus) ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (catSelect) catSelect.addEventListener('change', applyFilters);

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

      activeStatus = tab.getAttribute('data-status') || 'all';
      applyFilters();
    });
  });

  function updateDeviceModalViewMode(status, reason) {
    const rejectSec = document.getElementById('deviceRejectSection');
    const actionsBox = document.getElementById('devicePendingActions');
    const approvedNotice = document.getElementById('deviceApprovedNotice');
    const rejectedNotice = document.getElementById('deviceRejectedNotice');
    const reasonText = document.getElementById('deviceRejectedReasonText');
    const reasonInput = document.getElementById('moderateRejectReason');
    const reasonError = document.getElementById('deviceRejectError');

    // Reset error styling
    if (reasonInput) {
      reasonInput.style.borderColor = '#CBD5E1';
      reasonInput.style.backgroundColor = '#FFFFFF';
      reasonInput.style.boxShadow = 'none';
      reasonInput.value = '';
    }
    if (reasonError) reasonError.style.display = 'none';

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
  const devReasonInputEl = document.getElementById('moderateRejectReason');
  const devReasonErrorEl = document.getElementById('deviceRejectError');
  if (devReasonInputEl) {
    devReasonInputEl.addEventListener('input', function() {
      if (this.value.trim().length > 0) {
        this.style.borderColor = '#CBD5E1';
        this.style.backgroundColor = '#FFFFFF';
        this.style.boxShadow = 'none';
        if (devReasonErrorEl) devReasonErrorEl.style.display = 'none';
      }
    });
  }

  // Modal handler
  let currentTargetDevice = null;
  document.querySelectorAll('.btn-moderate-device').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.device-row');
      if (!row) return;
      currentTargetDevice = row;

      const title = row.querySelector('.device-title')?.textContent.trim() || 'Device';
      const img = row.getAttribute('data-image') || '';
      const brand = row.getAttribute('data-brand') || '';
      const category = row.getAttribute('data-category') || '';
      const condition = row.getAttribute('data-condition') || '99%';
      const dailyRate = Number(row.getAttribute('data-daily-rate')) || 0;
      const deposit = Number(row.getAttribute('data-deposit')) || 0;
      const reason = row.getAttribute('data-reason') || '';
      const status = row.getAttribute('data-status') || 'pending';

      document.getElementById('modalDeviceTitle').textContent = title;
      document.getElementById('modalDeviceImg').src = img;
      document.getElementById('modalDeviceSpecs').textContent = `${brand.toUpperCase()} • ${category} • Condition: ${condition}`;
      document.getElementById('modalDeviceRates').textContent = `${window.formatVND ? window.formatVND(dailyRate) : dailyRate} / day • Deposit: ${window.formatVND ? window.formatVND(deposit) : deposit}`;
      
      updateDeviceModalViewMode(status, reason);

      document.getElementById('deviceModerateModal').style.display = 'flex';
      if (window.lucide) window.lucide.createIcons();
    });
  });

  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        document.getElementById('deviceModerateModal').style.display = 'none';
      }
    });
  });

  // Submit Approve / Reject
  async function submitModeration(action) {
    if (!currentTargetDevice) return;
    const deviceId = currentTargetDevice.getAttribute('data-device-id');
    const reasonInput = document.getElementById('moderateRejectReason');
    const reasonError = document.getElementById('deviceRejectError');
    const reason = (reasonInput ? reasonInput.value : '').trim();

    if (action === 'reject') {
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

    const btnApprove = document.getElementById('btnApproveDeviceSubmit');
    const btnReject = document.getElementById('btnRejectDeviceSubmit');
    if (btnApprove) {
      btnApprove.disabled = true;
      if (action === 'approve') btnApprove.textContent = 'Đang phê duyệt...';
    }
    if (btnReject) {
      btnReject.disabled = true;
      if (action === 'reject') btnReject.textContent = 'Đang từ chối...';
    }

    try {
      const res = await fetch(`/api/admin/devices/${deviceId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        currentTargetDevice.setAttribute('data-status', newStatus);
        currentTargetDevice.setAttribute('data-reason', reason);

        const btnLabel = currentTargetDevice.querySelector('.btn-moderate-device-label');
        if (btnLabel) btnLabel.textContent = 'Xem chi tiết';

        const badgeCell = currentTargetDevice.querySelector('.device-status-badge-cell');
        if (badgeCell) {
          badgeCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Approved</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Rejected</span>';
        }

        updateDeviceModalViewMode(newStatus, reason);

        if (window.showAdminToast) {
          window.showAdminToast('Success', action === 'approve' ? 'Device approved successfully.' : 'Device listing rejected.', 'success');
        }
      } else {
        if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to moderate device.', 'error');
      }
    } catch (err) {
      if (window.showAdminToast) window.showAdminToast('Network Error', err.message, 'error');
    } finally {
      if (btnApprove) {
        btnApprove.disabled = false;
        btnApprove.textContent = 'Phê duyệt niêm yết';
      }
      if (btnReject) {
        btnReject.disabled = false;
        btnReject.textContent = 'Từ chối niêm yết';
      }
    }
  }

  const btnApprove = document.getElementById('btnApproveDeviceSubmit');
  const btnReject = document.getElementById('btnRejectDeviceSubmit');
  if (btnApprove) btnApprove.addEventListener('click', () => submitModeration('approve'));
  if (btnReject) btnReject.addEventListener('click', () => submitModeration('reject'));

  // Delete device
  document.querySelectorAll('.btn-delete-device').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      const row = btn.closest('.device-row');
      if (!row) return;
      const deviceId = row.getAttribute('data-device-id');
      const title = row.querySelector('.device-title')?.textContent.trim() || 'this device';

      if (!confirm(`Are you sure you want to remove listing "${title}" from the platform?`)) return;

      try {
        const res = await fetch(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          row.remove();
          if (window.showAdminToast) window.showAdminToast('Deleted', 'Device removed from platform.', 'success');
        } else {
          if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to delete device.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  });
});

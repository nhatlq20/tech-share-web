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

  // Modal handler
  let currentTargetDevice = null;
  document.querySelectorAll('.btn-moderate-device').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.device-row');
      if (!row) return;
      currentTargetDevice = row;

      const title = row.querySelector('.device-title')?.textContent.trim() || 'Thiết bị';
      const img = row.getAttribute('data-image') || '';
      const brand = row.getAttribute('data-brand') || '';
      const category = row.getAttribute('data-category') || '';
      const condition = row.getAttribute('data-condition') || '99%';
      const dailyRate = Number(row.getAttribute('data-daily-rate')) || 0;
      const deposit = Number(row.getAttribute('data-deposit')) || 0;
      const reason = row.getAttribute('data-reason') || '';

      document.getElementById('modalDeviceTitle').textContent = title;
      document.getElementById('modalDeviceImg').src = img;
      document.getElementById('modalDeviceSpecs').textContent = `${brand.toUpperCase()} • ${category} • Tình trạng: ${condition}`;
      document.getElementById('modalDeviceRates').textContent = `${window.formatVND ? window.formatVND(dailyRate) : dailyRate} / ngày • Cọc: ${window.formatVND ? window.formatVND(deposit) : deposit}`;
      document.getElementById('moderateRejectReason').value = reason;

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
    const reason = document.getElementById('moderateRejectReason').value.trim();

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

        const badgeCell = currentTargetDevice.querySelector('.device-status-badge-cell');
        if (badgeCell) {
          badgeCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Đã duyệt</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Bị từ chối</span>';
        }
        if (window.showAdminToast) {
          window.showAdminToast('Thành công', action === 'approve' ? 'Đã phê duyệt thiết bị.' : 'Đã từ chối niêm yết thiết bị.', 'success');
        }
      } else {
        if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể kiểm duyệt thiết bị.', 'error');
      }
    } catch (err) {
      if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
    } finally {
      document.getElementById('deviceModerateModal').style.display = 'none';
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
      const title = row.querySelector('.device-title')?.textContent.trim() || 'thiết bị này';

      if (!confirm(`Bạn có chắc chắn muốn xóa niêm yết "${title}" khỏi nền tảng?`)) return;

      try {
        const res = await fetch(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          row.remove();
          if (window.showAdminToast) window.showAdminToast('Đã xóa', 'Đã gỡ bỏ thiết bị khỏi sàn.', 'success');
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể xóa thiết bị.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  });
});

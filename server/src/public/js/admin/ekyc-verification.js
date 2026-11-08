/**
 * TechShare Admin Portal - eKYC Verification Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  let targetEkycRow = null;

  document.querySelectorAll('.btn-inspect-ekyc').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.ekyc-row');
      if (!row) return;
      targetEkycRow = row;

      const name = row.getAttribute('data-name');
      const cccd = row.getAttribute('data-cccd');
      const dob = row.getAttribute('data-dob');
      const addr = row.getAttribute('data-address');
      const front = row.getAttribute('data-front');
      const back = row.getAttribute('data-back');
      const portrait = row.getAttribute('data-portrait');

      document.getElementById('ekycModalName').textContent = name;
      document.getElementById('ekycModalCccd').textContent = cccd;
      document.getElementById('ekycModalDob').textContent = dob;
      document.getElementById('ekycModalAddr').textContent = addr;

      document.getElementById('ekycImgFront').src = front;
      document.getElementById('ekycImgBack').src = back;
      document.getElementById('ekycImgPortrait').src = portrait;

      document.getElementById('ekycModal').style.display = 'flex';
    });
  });

  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        document.getElementById('ekycModal').style.display = 'none';
      }
    });
  });

  async function handleEkycAction(action) {
    if (!targetEkycRow) return;
    const reqId = targetEkycRow.getAttribute('data-id');
    const endpoint = `/api/admin/ekyc/${reqId}/${action}`;

    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: action === 'reject' ? 'Giấy tờ không đủ độ phân giải hoặc mờ.' : '' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const statusCell = targetEkycRow.querySelector('.ekyc-status-cell');
        if (statusCell) {
          statusCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Đã xác minh</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Bị từ chối</span>';
        }
        if (window.showAdminToast) {
          window.showAdminToast('Thành công', action === 'approve' ? 'Đã duyệt eKYC.' : 'Đã từ chối eKYC.', 'success');
        }
      } else {
        if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể cập nhật eKYC.', 'error');
      }
    } catch (err) {
      if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
    } finally {
      document.getElementById('ekycModal').style.display = 'none';
    }
  }

  const btnApprove = document.getElementById('btnApproveEkyc');
  const btnReject = document.getElementById('btnRejectEkyc');
  if (btnApprove) btnApprove.addEventListener('click', () => handleEkycAction('approve'));
  if (btnReject) btnReject.addEventListener('click', () => handleEkycAction('reject'));
});

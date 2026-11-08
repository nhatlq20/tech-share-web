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
        body: JSON.stringify({ reason: action === 'reject' ? 'ID documents are blurry or insufficient resolution.' : '' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const statusCell = targetEkycRow.querySelector('.ekyc-status-cell');
        if (statusCell) {
          statusCell.innerHTML = action === 'approve'
            ? '<span class="admin-pill-badge" style="background-color: #ECFDF5; color: #16A34A;">Verified</span>'
            : '<span class="admin-pill-badge" style="background-color: #FEF2F2; color: #DC2626;">Rejected</span>';
        }
        if (window.showAdminToast) {
          window.showAdminToast('Success', action === 'approve' ? 'eKYC verified successfully.' : 'eKYC rejected.', 'success');
        }
      } else {
        if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to update eKYC.', 'error');
      }
    } catch (err) {
      if (window.showAdminToast) window.showAdminToast('Network Error', err.message, 'error');
    } finally {
      document.getElementById('ekycModal').style.display = 'none';
    }
  }

  const btnApprove = document.getElementById('btnApproveEkyc');
  const btnReject = document.getElementById('btnRejectEkyc');
  if (btnApprove) btnApprove.addEventListener('click', () => handleEkycAction('approve'));
  if (btnReject) btnReject.addEventListener('click', () => handleEkycAction('reject'));
});

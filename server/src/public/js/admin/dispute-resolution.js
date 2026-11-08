/**
 * TechShare Admin Portal - Dispute Resolution Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  let targetDisputeRow = null;

  document.querySelectorAll('.btn-resolve-dispute').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.dispute-row');
      if (!row) return;
      targetDisputeRow = row;

      const deposit = Number(row.getAttribute('data-deposit')) || 0;
      document.getElementById('maxDepositLimit').textContent = window.formatVND ? window.formatVND(deposit) : `${deposit} ₫`;
      document.getElementById('disputeDeductionInput').value = '';
      document.getElementById('disputeDeductionInput').max = deposit;
      document.getElementById('disputeNotesInput').value = '';

      document.getElementById('resolveDisputeModal').style.display = 'flex';
    });
  });

  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        document.getElementById('resolveDisputeModal').style.display = 'none';
      }
    });
  });

  // Submit Resolve
  const btnResolve = document.getElementById('btnConfirmResolveSubmit');
  if (btnResolve) {
    btnResolve.addEventListener('click', async function() {
      if (!targetDisputeRow) return;
      const disputeId = targetDisputeRow.getAttribute('data-id');
      const deposit = Number(targetDisputeRow.getAttribute('data-deposit')) || 0;
      const deduction = Number(document.getElementById('disputeDeductionInput').value) || 0;
      const notes = document.getElementById('disputeNotesInput').value.trim();

      if (deduction < 0 || deduction > deposit) {
        alert('Số tiền khấu trừ không hợp lệ (không được âm và không được vượt quá số tiền ký quỹ đang giữ).');
        return;
      }

      try {
        const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deductionAmount: deduction, notes }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Thành công', 'Đã phân xử và quyết toán tranh chấp.', 'success');
          setTimeout(() => window.location.reload(), 600);
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể giải quyết tranh chấp.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  }

  // Dismiss
  const btnDismiss = document.getElementById('btnDismissDisputeSubmit');
  if (btnDismiss) {
    btnDismiss.addEventListener('click', async function() {
      if (!targetDisputeRow) return;
      const disputeId = targetDisputeRow.getAttribute('data-id');
      const notes = document.getElementById('disputeNotesInput').value.trim();

      try {
        const res = await fetch(`/api/admin/disputes/${disputeId}/dismiss`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Đã bác bỏ', 'Đã bác bỏ khiếu nại tranh chấp.', 'success');
          setTimeout(() => window.location.reload(), 600);
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể bác bỏ tranh chấp.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  }
});

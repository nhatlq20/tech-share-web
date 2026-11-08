/**
 * TechShare Admin Portal - Voucher Management Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('createVoucherModal');
  const btnOpen = document.getElementById('btnOpenCreateVoucherModal');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      // Set default expiry date to 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      document.getElementById('vExpiry').value = d.toISOString().split('T')[0];
      modal.style.display = 'flex';
    });
  }

  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        modal.style.display = 'none';
      }
    });
  });

  // Toggle status
  document.querySelectorAll('.btn-toggle-voucher-status').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      const vId = btn.getAttribute('data-id');
      const currentActive = btn.getAttribute('data-active') === 'true';

      try {
        const res = await fetch(`/api/admin/vouchers/${vId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !currentActive }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Success', 'Voucher status updated successfully.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to update voucher status.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Network Error', err.message, 'error');
      }
    });
  });

  // Create form
  const form = document.getElementById('createVoucherForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const code = document.getElementById('vCode').value.trim().toUpperCase();
      const type = document.getElementById('vType').value;
      const value = Number(document.getElementById('vValue').value);
      const usageLimit = Number(document.getElementById('vLimit').value);
      const expiryDate = document.getElementById('vExpiry').value;

      try {
        const res = await fetch('/api/admin/vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, type, value, usageLimit, expiryDate }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Success', 'Promotion voucher created successfully.', 'success');
          setTimeout(() => window.location.reload(), 600);
        } else {
          if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to create voucher.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  }
});

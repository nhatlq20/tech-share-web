/**
 * TechShare Admin Portal - Notification Management Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('broadcastModal');
  const btnOpen = document.getElementById('btnOpenSendNotifModal');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
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

  const form = document.getElementById('broadcastForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const targetRole = document.getElementById('notifTargetRole').value;
      const title = document.getElementById('notifTitle').value.trim();
      const message = document.getElementById('notifMessage').value.trim();

      try {
        const res = await fetch('/api/admin/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole, title, message }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Đã phát sóng', 'Thông báo đã được gửi đến thành viên.', 'success');
          setTimeout(() => window.location.reload(), 600);
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể phát sóng thông báo.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  }
});

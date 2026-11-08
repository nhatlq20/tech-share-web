/**
 * TechShare Admin Portal - Roles & Permissions Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('reassignRoleModal');
  let targetAccountId = null;

  document.querySelectorAll('.btn-open-role-modal').forEach(function(btn) {
    btn.addEventListener('click', function() {
      targetAccountId = btn.getAttribute('data-id');
      const email = btn.getAttribute('data-email');
      const role = btn.getAttribute('data-role');

      document.getElementById('roleModalAccEmail').textContent = email;
      document.getElementById('selectNewRole').value = role;

      modal.style.display = 'flex';
    });
  });

  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        modal.style.display = 'none';
      }
    });
  });

  const btnSubmit = document.getElementById('btnSubmitRoleChange');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', async function() {
      if (!targetAccountId) return;
      const roleCode = document.getElementById('selectNewRole').value;

      try {
        const res = await fetch(`/api/admin/accounts/${targetAccountId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleCode }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Thành công', 'Đã cập nhật vai trò tài khoản.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi phân quyền', data.message || 'Không thể thay đổi vai trò.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      } finally {
        modal.style.display = 'none';
      }
    });
  }
});

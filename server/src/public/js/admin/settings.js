/**
 * TechShare Admin Portal - Settings Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('editSettingModal');

  document.querySelectorAll('.btn-edit-setting').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const key = btn.getAttribute('data-key');
      const val = btn.getAttribute('data-value');

      document.getElementById('settingModalKey').value = key;
      document.getElementById('settingModalValue').value = val;

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

  const form = document.getElementById('editSettingForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const key = document.getElementById('settingModalKey').value;
      const rawValue = document.getElementById('settingModalValue').value.trim();

      let parsedValue = rawValue;
      if (!isNaN(rawValue) && rawValue !== '') {
        parsedValue = Number(rawValue);
      } else if (rawValue === 'true') parsedValue = true;
      else if (rawValue === 'false') parsedValue = false;

      try {
        const res = await fetch(`/api/admin/settings/${key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: parsedValue }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Success', 'System setting saved successfully.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (window.showAdminToast) window.showAdminToast('Update Error', data.message || 'Failed to save setting.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Network Error', err.message, 'error');
      }
    });
  }
});

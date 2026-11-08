/**
 * TechShare Admin Portal - Common Client Utilities
 * Handles Icons, Toasts, Dropdowns, AJAX API helper, and Global Search
 */

// Show Toast notification
window.showAdminToast = function(title, message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;

  const iconName = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-triangle' : 'info';
  const iconColor = type === 'success' ? '#16A34A' : type === 'error' ? '#DC2626' : '#286E74';

  toast.innerHTML = `
    <div class="admin-toast-icon" style="color: ${iconColor};">
      <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
    </div>
    <div class="admin-toast-content">
      <div class="admin-toast-title" style="font-weight: 700; font-size: 13px; color: #0F172A;">${escapeHtml(title)}</div>
      <div class="admin-toast-message" style="font-size: 12px; color: #64748B; margin-top: 2px;">${escapeHtml(message)}</div>
    </div>
    <button type="button" class="admin-toast-close" style="background: none; border: none; cursor: pointer; color: #94A3B8; margin-left: 8px;">
      <i data-lucide="x" style="width: 14px; height: 14px;"></i>
    </button>
  `;

  toast.querySelector('.admin-toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Safe HTML Escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toggle Notification Dropdown
window.toggleNotificationDropdown = function() {
  const dropdown = document.getElementById('adminNotifDropdown');
  if (dropdown) {
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
  }
};

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('adminNotifDropdown');
  const btn = document.getElementById('adminNotifBtn');
  if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// Helper for formatted VND
window.formatVND = function(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
};

// Global search filter for active tables
document.addEventListener('DOMContentLoaded', function() {
  const globalInput = document.getElementById('globalAdminSearch');
  if (globalInput) {
    globalInput.addEventListener('input', function(e) {
      const term = e.target.value.toLowerCase().trim();
      const localSearch = document.getElementById('userSearchInput') || document.getElementById('tableSearchInput');
      if (localSearch) {
        localSearch.value = e.target.value;
        localSearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
});

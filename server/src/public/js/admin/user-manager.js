/**
 * TechShare Admin Portal - User Manager Interactivity
 * Handles live filtering, User Details modal, and Lock/Unlock status toggle via API
 */

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('userSearchInput');
  const roleSelect = document.getElementById('roleFilterSelect');
  const statusSelect = document.getElementById('statusFilterSelect');
  const rows = document.querySelectorAll('.user-table-row');

  // Filter function
  function applyFilters() {
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const selectedRole = roleSelect ? roleSelect.value : 'all';
    const selectedStatus = statusSelect ? statusSelect.value : 'all';

    let visibleCount = 0;

    rows.forEach(function(row) {
      const name = row.getAttribute('data-name') || '';
      const email = row.getAttribute('data-email') || '';
      const phone = row.getAttribute('data-phone') || '';
      const role = row.getAttribute('data-role') || '';
      const status = row.getAttribute('data-status') || '';

      const matchesSearch = !searchTerm || name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
      const matchesRole = selectedRole === 'all' || role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

      if (matchesSearch && matchesRole && matchesStatus) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const emptyRow = document.getElementById('emptyUsersRow');
    if (emptyRow) {
      emptyRow.style.display = visibleCount === 0 ? '' : 'none';
    }
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (roleSelect) roleSelect.addEventListener('change', applyFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyFilters);

  // Close modals handler
  document.querySelectorAll('.btn-close-modal, .admin-modal-overlay').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target === el || el.classList.contains('btn-close-modal')) {
        document.getElementById('lockConfirmModal').style.display = 'none';
        document.getElementById('userDetailModal').style.display = 'none';
      }
    });
  });

  // Modal 2: View User Details & Escrow
  document.querySelectorAll('.btn-view-user').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.user-table-row');
      if (!row) return;

      const name = row.querySelector('.user-display-name')?.textContent || 'Người dùng';
      const email = row.getAttribute('data-email') || '';
      const phone = row.getAttribute('data-phone') || 'Not updated';
      const avatar = row.getAttribute('data-avatar') || '';
      const wallet = Number(row.getAttribute('data-wallet-balance')) || 0;
      const escrow = Number(row.getAttribute('data-escrow-balance')) || 0;
      const trustScore = Number(row.getAttribute('data-trust-score')) || 100;
      const isVerified = row.getAttribute('data-is-verified') === 'true';

      document.getElementById('detailModalName').textContent = name;
      document.getElementById('detailModalContact').textContent = `${email} • ${phone}`;
      document.getElementById('detailModalAvatar').src = avatar;
      document.getElementById('detailModalWallet').textContent = window.formatVND ? window.formatVND(wallet) : `${wallet.toLocaleString()} ₫`;
      document.getElementById('detailModalEscrow').textContent = window.formatVND ? window.formatVND(escrow) : `${escrow.toLocaleString()} ₫`;
      document.getElementById('detailModalTrustScore').textContent = `${trustScore}/100`;

      const pBar = document.getElementById('detailModalProgressBar');
      pBar.style.width = `${trustScore}%`;
      pBar.style.backgroundColor = trustScore >= 85 ? '#22C55E' : trustScore >= 70 ? '#EAB308' : '#EF4444';

      const vNote = document.getElementById('detailModalVerifiedNote');
      vNote.textContent = isVerified
        ? '✓ Identity verified with highest National ID level (eKYC).'
        : '⚠️ Account has not completed electronic identity verification (eKYC).';

      document.getElementById('userDetailModal').style.display = 'flex';
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Modal 1: Lock / Unlock User Status
  let targetRowForLock = null;
  document.querySelectorAll('.btn-toggle-status').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.user-table-row');
      if (!row) return;
      targetRowForLock = row;

      const currentStatus = row.getAttribute('data-status');
      const isActive = currentStatus === 'active';
      const userName = row.querySelector('.user-display-name')?.textContent || 'người dùng';
      const userEmail = row.getAttribute('data-email') || '';

      const titleEl = document.getElementById('lockModalTitle');
      const descEl = document.getElementById('lockModalDesc');
      const submitBtn = document.getElementById('confirmLockSubmitBtn');
      const iconEl = document.getElementById('lockModalIcon');

      if (isActive) {
        titleEl.textContent = 'Confirm Lock Account';
        iconEl.style.color = '#DC2626';
        descEl.innerHTML = `Are you sure you want to <strong>lock the account</strong> of <strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail)})? This user will not be able to log in or rent devices on TechShare.`;
        submitBtn.className = 'admin-btn admin-btn-danger';
        submitBtn.textContent = 'Confirm Lock';
      } else {
        titleEl.textContent = 'Confirm Unlock Account';
        iconEl.style.color = '#16A34A';
        descEl.innerHTML = `Are you sure you want to <strong>unlock the account</strong> of <strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail)})?`;
        submitBtn.className = 'admin-btn admin-btn-success';
        submitBtn.textContent = 'Confirm Unlock';
      }

      document.getElementById('lockConfirmModal').style.display = 'flex';
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Submit Lock / Unlock via API
  const confirmLockBtn = document.getElementById('confirmLockSubmitBtn');
  if (confirmLockBtn) {
    confirmLockBtn.addEventListener('click', async function() {
      if (!targetRowForLock) return;

      const userId = targetRowForLock.getAttribute('data-user-id');
      const currentStatus = targetRowForLock.getAttribute('data-status');
      const willBeActive = currentStatus !== 'active';

      confirmLockBtn.disabled = true;
      confirmLockBtn.textContent = 'Processing...';

      try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: willBeActive }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update row in DOM
          const nextStatus = willBeActive ? 'active' : 'locked';
          targetRowForLock.setAttribute('data-status', nextStatus);

          const statusCell = targetRowForLock.querySelector('.user-status-cell');
          if (statusCell) {
            statusCell.innerHTML = willBeActive
              ? '<span class="admin-pill-badge active"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: #22C55E; flex-shrink: 0;"></span> Active</span>'
              : '<span class="admin-pill-badge locked"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: #EF4444; flex-shrink: 0;"></span> Locked</span>';
          }

          const actionBtn = targetRowForLock.querySelector('.btn-toggle-status');
          if (actionBtn) {
            actionBtn.className = `btn-toggle-status ${willBeActive ? 'admin-user-btn-lock' : 'admin-user-btn-unlock'}`;
            actionBtn.title = willBeActive ? 'Lock this account' : 'Unlock this account';
            actionBtn.innerHTML = `
              <i data-lucide="${willBeActive ? 'lock' : 'unlock'}" style="width: 13px; height: 13px; flex-shrink: 0;"></i>
              <span>${willBeActive ? 'Lock' : 'Unlock'}</span>
            `;
          }

          if (window.showAdminToast) {
            window.showAdminToast(
              'Operation Successful',
              `Account successfully ${willBeActive ? 'unlocked' : 'locked'}.`,
              'success'
            );
          }
          if (window.lucide) window.lucide.createIcons();
        } else {
          if (window.showAdminToast) {
            window.showAdminToast('Update Error', data.message || 'Failed to update account status.', 'error');
          }
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái người dùng:', err);
        if (window.showAdminToast) {
          window.showAdminToast('Network Error', 'Unable to connect to server.', 'error');
        }
      } finally {
        confirmLockBtn.disabled = false;
        document.getElementById('lockConfirmModal').style.display = 'none';
      }
    });
  }
});

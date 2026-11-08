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

  // View user details
  document.querySelectorAll('.btn-view-user').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const row = btn.closest('.user-table-row');
      if (!row) return;

      const name = row.querySelector('.user-display-name')?.textContent || 'Người dùng';
      const email = row.getAttribute('data-email') || '';
      const phone = row.getAttribute('data-phone') || 'Not updated';
      const avatar = row.getAttribute('data-avatar') || '';
      const trustScore = Number(row.getAttribute('data-trust-score')) || 100;
      const isVerified = row.getAttribute('data-is-verified') === 'true';
      const isBanned = row.getAttribute('data-is-banned') === 'true' || row.getAttribute('data-status') === 'locked';
      const banReason = row.getAttribute('data-ban-reason') || '';

      document.getElementById('detailModalName').textContent = name;
      document.getElementById('detailModalContact').textContent = `${email} • ${phone}`;
      document.getElementById('detailModalAvatar').src = avatar;
      document.getElementById('detailModalTrustScore').textContent = `${trustScore}/100`;

      // Hiển thị khung thông tin khóa nếu tài khoản đang bị khóa
      const banBox = document.getElementById('detailModalBanBox');
      const banReasonEl = document.getElementById('detailModalBanReason');
      if (banBox && banReasonEl) {
        if (isBanned) {
          banBox.style.display = 'block';
          banReasonEl.textContent = banReason || 'Vi phạm chính sách nền tảng TechShare';
        } else {
          banBox.style.display = 'none';
        }
      }

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
      const reasonField = document.getElementById('banReasonField');
      const reasonInput = document.getElementById('banReasonInput');
      const reasonError = document.getElementById('banReasonError');

      if (reasonError) reasonError.style.display = 'none';

      if (isActive) {
        titleEl.textContent = 'Confirm Lock Account';
        iconEl.style.color = '#DC2626';
        descEl.innerHTML = `Bạn có chắc chắn muốn <strong>khóa tài khoản</strong> của <strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail)})? Người dùng này sẽ lập tức bị đăng xuất nếu đang online và không thể tiếp tục đăng nhập.`;
        submitBtn.className = 'admin-btn admin-btn-danger';
        submitBtn.textContent = 'Đồng ý Khóa';
        if (reasonField) reasonField.style.display = 'block';
        if (reasonInput) {
          reasonInput.value = '';
          setTimeout(() => reasonInput.focus(), 100);
        }
      } else {
        titleEl.textContent = 'Confirm Unlock Account';
        iconEl.style.color = '#16A34A';
        descEl.innerHTML = `Are you sure you want to <strong>unlock the account</strong> of <strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail)})?`;
        submitBtn.className = 'admin-btn admin-btn-success';
        submitBtn.textContent = 'Đồng ý Mở khóa';
        if (reasonField) reasonField.style.display = 'none';
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
      const reasonInput = document.getElementById('banReasonInput');
      const reasonError = document.getElementById('banReasonError');
      const enteredReason = (reasonInput ? reasonInput.value : '').trim();

      // Khi khóa tài khoản: bắt buộc nhập lý do
      if (!willBeActive) {
        if (!enteredReason) {
          if (reasonError) reasonError.style.display = 'block';
          if (reasonInput) reasonInput.focus();
          return;
        }
      }
      if (reasonError) reasonError.style.display = 'none';

      confirmLockBtn.disabled = true;
      confirmLockBtn.textContent = 'Processing...';

      try {
        const response = await fetch(`/api/admin/users/${userId}/ban`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: willBeActive,
            isbanned: !willBeActive,
            reason: willBeActive ? '' : enteredReason,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update row in DOM
          const nextStatus = willBeActive ? 'active' : 'locked';
          const finalReason = willBeActive ? '' : (data.data?.banReason || enteredReason);

          targetRowForLock.setAttribute('data-status', nextStatus);
          targetRowForLock.setAttribute('data-is-banned', willBeActive ? 'false' : 'true');
          targetRowForLock.setAttribute('data-ban-reason', finalReason);

          const statusCell = targetRowForLock.querySelector('.user-status-cell');
          if (statusCell) {
            statusCell.innerHTML = willBeActive
              ? '<span class="admin-pill-badge active"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: #22C55E; flex-shrink: 0;"></span> Hoạt động</span>'
              : `<span class="admin-pill-badge locked" title="Lý do: ${escapeHtml(finalReason)}"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: #EF4444; flex-shrink: 0;"></span> Đã khóa</span>` +
                (finalReason ? `<div class="user-ban-reason-text" style="font-size: 11.5px; color: #DC2626; font-weight: 500; margin-top: 4px; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(finalReason)}">Lý do: ${escapeHtml(finalReason)}</div>` : '');
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
              'Thao tác thành công',
              `Đã ${willBeActive ? 'mở khóa' : 'khóa'} tài khoản thành công.${!willBeActive ? ' Người dùng đang online sẽ bị ngắt kết nối và đăng xuất.' : ''}`,
              'success'
            );
          }
          if (window.lucide) window.lucide.createIcons();
          document.getElementById('lockConfirmModal').style.display = 'none';
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
      }
    });
  }
});

/**
 * TechShare Admin Portal - Review Moderation Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn-moderate-review').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      const reviewId = btn.getAttribute('data-id');
      const nextStatus = btn.getAttribute('data-status');

      try {
        const res = await fetch(`/api/admin/reviews/${reviewId}/moderation`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus,
            reason: nextStatus === 'hidden' ? 'Nội dung phản cảm hoặc không đúng thực tế.' : ''
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Thành công', 'Đã cập nhật trạng thái đánh giá.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (window.showAdminToast) window.showAdminToast('Lỗi', data.message || 'Không thể kiểm duyệt đánh giá.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Lỗi mạng', err.message, 'error');
      }
    });
  });
});

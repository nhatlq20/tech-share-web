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
            reason: nextStatus === 'hidden' ? 'Content violates platform guidelines.' : ''
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (window.showAdminToast) window.showAdminToast('Success', 'Review status updated successfully.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (window.showAdminToast) window.showAdminToast('Error', data.message || 'Failed to moderate review.', 'error');
        }
      } catch (err) {
        if (window.showAdminToast) window.showAdminToast('Network Error', err.message, 'error');
      }
    });
  });
});

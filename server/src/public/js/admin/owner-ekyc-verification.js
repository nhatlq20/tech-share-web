document.querySelectorAll('[data-owner-ekyc-review]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const action = event.submitter?.value;
    if (!action) return;

    const id = encodeURIComponent(form.dataset.ownerEkycReview);
    const reason = new FormData(form).get('reason').trim();
    const buttons = Array.from(form.querySelectorAll('button'));
    const status = form.querySelector('[role="status"]');
    if (action === 'reject' && !reason) {
      status.textContent = 'Please enter a rejection reason.';
      return;
    }
    if (action === 'approve' && !window.confirm('Approve request and grant Owner privileges?')) return;

    buttons.forEach((button) => { button.disabled = true; });
    status.textContent = 'Updating request…';
    try {
      const response = await fetch(`/api/admin/owner-ekyc/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update request.');
      }
      window.location.reload();
    } catch (error) {
      status.textContent = error.message;
      buttons.forEach((button) => { button.disabled = false; });
    }
  });
});

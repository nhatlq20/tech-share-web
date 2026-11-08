/**
 * TechShare Admin Portal - Booking Management Interactivity
 */

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('bookingSearchInput');
  const statusFilter = document.getElementById('bookingStatusFilter');
  const rows = document.querySelectorAll('.booking-row');

  function applyFilters() {
    const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const status = statusFilter ? statusFilter.value : 'all';

    rows.forEach(function(row) {
      const code = row.getAttribute('data-code') || '';
      const renter = row.getAttribute('data-renter') || '';
      const owner = row.getAttribute('data-owner') || '';
      const device = row.getAttribute('data-device') || '';
      const rowStatus = row.getAttribute('data-status') || '';

      const matchSearch = !term || code.includes(term) || renter.includes(term) || owner.includes(term) || device.includes(term);
      const matchStatus = status === 'all' || rowStatus === status;

      row.style.display = (matchSearch && matchStatus) ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
});

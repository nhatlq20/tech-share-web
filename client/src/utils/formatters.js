/**
 * Utility helper functions for formatting
 */

export const formatPrice = (amount) => {
  if (typeof amount !== 'number') return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

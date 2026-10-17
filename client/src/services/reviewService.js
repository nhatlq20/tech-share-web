import api from './api';

const reviewPath = deviceId => `/devices/${encodeURIComponent(deviceId)}/reviews`;

export const reviewService = {
  getDeviceReviews: (deviceId, params) => api.get(reviewPath(deviceId), { params }),
  getEligibility: deviceId => api.get(`${reviewPath(deviceId)}/eligibility`),
  createReview: (deviceId, review) => api.post(reviewPath(deviceId), review),
  updateReview: (deviceId, reviewId, review) => api.patch(`${reviewPath(deviceId)}/${reviewId}`, review),
  deleteReview: (deviceId, reviewId) => api.delete(`${reviewPath(deviceId)}/${reviewId}`),
  replyToReview: (deviceId, reviewId, comment) => api.put(`${reviewPath(deviceId)}/${reviewId}/reply`, { comment }),
};

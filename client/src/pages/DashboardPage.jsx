import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';

export const DashboardPage = () => {
  return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
};

export default DashboardPage;

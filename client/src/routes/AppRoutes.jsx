import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './routes.js';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { CatalogPage } from '../pages/CatalogPage.jsx';
import { DeviceDetailPage } from '../pages/DeviceDetailPage.jsx';
import { NearbyPage } from '../pages/NearbyPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { AdminPage } from '../pages/AdminPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Tất cả route công khai dùng chung PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.EXPLORE} element={<CatalogPage />} />
        <Route path={ROUTES.DEVICE_DETAIL} element={<DeviceDetailPage />} />
        <Route path={ROUTES.DEVICE_DETAIL_LEGACY} element={<DeviceDetailPage />} />
        <Route path={ROUTES.NEARBY} element={<NearbyPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.ADMIN} element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

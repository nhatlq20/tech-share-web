import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './routes.js';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { PublicLayout } from '../layouts/PublicLayout.jsx';

// Public pages
import { HomePage } from '../pages/HomePage.jsx';
import { CatalogPage } from '../pages/CatalogPage.jsx';
import { DeviceDetailPage } from '../pages/DeviceDetailPage.jsx';
import { BookingCheckoutPage } from '../pages/booking/BookingCheckoutPage.jsx';
import { MyBookingsPage } from '../pages/booking/MyBookingsPage.jsx';
import { BookingDetailPage } from '../pages/booking/BookingDetailPage.jsx';
import { NearbyPage } from '../pages/NearbyPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

// Auth-required pages
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';

// Role-specific pages
import { AdminPage } from '../pages/AdminPage.jsx';
import { AdminLoginPage } from '../pages/AdminLoginPage.jsx';
import { OwnerPage } from '../pages/OwnerPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Admin Portal ──────────────────────────────────────────────────
          Không có Navbar/Footer, chỉ vào bằng gõ URL trực tiếp          */}
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />

      {/* ── Owner Hub (Chủ thiết bị) - Dedicated Workspace Layout ─────── */}
      <Route
        path={ROUTES.OWNER}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_DASHBOARD}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_DEVICES}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_DEVICE_NEW}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_BOOKINGS}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_CALENDAR}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_ANALYTICS}
        element={
          <ProtectedRoute roles={['owner']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OWNER_WALLET}
        element={
          <ProtectedRoute roles={['owner', 'admin']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />

      {/* ── Public Layout (có Navbar + Footer) ───────────────────────── */}
      <Route element={<PublicLayout />}>
        {/* Trang công khai – ai cũng vào được */}
        <Route path={ROUTES.HOME}               element={<HomePage />} />
        <Route path={ROUTES.EXPLORE}            element={<CatalogPage />} />
        <Route path={ROUTES.DEVICE_DETAIL}      element={<DeviceDetailPage />} />
        <Route path={ROUTES.DEVICE_DETAIL_LEGACY} element={<DeviceDetailPage />} />
        <Route path={ROUTES.BOOKING_CHECKOUT}   element={<BookingCheckoutPage />} />
        <Route path={ROUTES.NEARBY}             element={<NearbyPage />} />
        <Route path={ROUTES.LOGIN}              element={<LoginPage />} />
        <Route path={ROUTES.REGISTER}           element={<RegisterPage />} />

        {/* Cần đăng nhập (bất kỳ role) */}
        <Route
          path={ROUTES.MY_BOOKINGS}
          element={
            <ProtectedRoute roles={['renter', 'owner', 'admin']}>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BOOKING_DETAIL}
          element={
            <ProtectedRoute roles={['renter', 'owner', 'admin']}>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <ProtectedRoute roles={['renter', 'owner', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute roles={['renter', 'owner', 'admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Chỉ admin */}
        <Route
          path={ROUTES.ADMIN}
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

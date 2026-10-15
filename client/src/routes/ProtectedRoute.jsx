import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from './routes.js';

/**
 * ProtectedRoute – Bảo vệ route theo trạng thái đăng nhập và vai trò (role)
 *
 * Props:
 *  @param {React.ReactNode} children  – Component con cần bảo vệ
 *  @param {string|string[]} roles     – Role(s) được phép. Nếu không truyền → chỉ cần đăng nhập.
 *  @param {string}          redirectTo – Trang redirect nếu không đủ quyền (mặc định: HOME)
 *
 * Luồng kiểm tra:
 *  1. Chưa đăng nhập  → redirect về LOGIN (user/owner) hoặc ADMIN_LOGIN (admin)
 *  2. Đã đăng nhập nhưng sai role → redirect về HOME với thông báo
 *  3. Đúng → render children
 */
export const ProtectedRoute = ({ children, roles, redirectTo }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Đợi AuthContext xác minh token (tránh flash redirect)
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e8f6f7',
            borderTopColor: '#67BEC3',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  // 1. Chưa đăng nhập → về trang login phù hợp
  if (!isAuthenticated) {
    // Chỉ khi route dành riêng duy nhất cho Admin → về Admin Login Portal
    const isAdminOnly = Array.isArray(roles)
      ? roles.length === 1 && roles[0] === 'admin'
      : roles === 'admin';

    if (isAdminOnly) {
      return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
    }

    // Các route khác → về Login thông thường, giữ lại trang đích để redirect sau khi login
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // 2. Đã đăng nhập nhưng role không khớp → về HOME
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(user?.role)) {
      return <Navigate to={redirectTo || ROUTES.HOME} replace />;
    }
  }

  // 3. Hợp lệ → render component
  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="navbar-logo-link">
          <img src="/assets/logo.svg" alt="TechShare Logo" className="navbar-logo-img" />
          <div className="navbar-logo-brand">
            <div className="navbar-brand-title">
              <span className="navbar-brand-tech">Tech</span>
              <span className="navbar-brand-share">Share</span>
            </div>
            <span className="navbar-brand-sub">
              Thuê thiết bị công nghệ dễ dàng
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="navbar-links">
          <Link to={ROUTES.HOME} className="navbar-link">
            Trang chủ
          </Link>
          <Link to={ROUTES.EXPLORE} className="navbar-link">
            Khám phá thiết bị
          </Link>
          <Link to={ROUTES.COMPARE || '/compare'} className="navbar-link">
            So sánh
          </Link>
        </nav>

        {/* Auth Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                to={user?.role === 'admin' ? (ROUTES.ADMIN?.ROOT || ROUTES.ADMIN) : (ROUTES.DASHBOARD?.ROOT || ROUTES.DASHBOARD)}
                className="navbar-link"
                style={{ fontWeight: 600 }}
              >
                {user?.fullName || user?.name || 'Dashboard'}
              </Link>
              <button
                onClick={logout}
                className="navbar-btn-logout"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to={ROUTES.LOGIN}
                className="navbar-btn-login"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="navbar-btn-register"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

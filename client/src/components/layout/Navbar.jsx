import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { NotificationDropdown } from '../notifications/NotificationDropdown.jsx';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

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
              Easy Tech Device Rentals
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="navbar-links">
          <Link to={ROUTES.HOME} className="navbar-link">
            Home
          </Link>
          <Link to={ROUTES.EXPLORE} className="navbar-link">
            Explore
          </Link>
          <Link to={ROUTES.NEARBY} className="navbar-link">
            Nearby
          </Link>
          <Link to={ROUTES.COMPARE || '/compare'} className="navbar-link">
            Compare
          </Link>
          {/* Chỉ hiện với Owner */}
          {user?.role === 'owner' && (
            <Link to={ROUTES.OWNER} className="navbar-link navbar-link-owner">
              Owner
            </Link>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="navbar-user-section">
              {/* Notification Bell Dropdown */}
              <NotificationDropdown />

              {/* Avatar linking to Profile Page */}
              <Link
                to={ROUTES.PROFILE}
                className="navbar-avatar-link"
                title={`Hồ sơ cá nhân: ${user?.name || user?.email || 'Xem Profile'}`}
              >
                <div className="navbar-avatar-wrapper">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user?.name || 'Avatar'}
                      className="navbar-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement.querySelector('.navbar-avatar-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="navbar-avatar-fallback"
                    style={{ display: user?.avatar ? 'none' : 'flex' }}
                  >
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="navbar-avatar-status" title="Đang trực tuyến" />
                </div>
                <div className="navbar-user-meta">
                  <span className="navbar-user-name">{user?.name || 'Người dùng'}</span>
                  <span className="navbar-user-role">
                    {user?.role === 'admin'
                      ? 'Quản trị viên'
                      : user?.role === 'owner'
                      ? 'Chủ thiết bị'
                      : 'Người thuê'}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="navbar-btn-logout"
                title="Đăng xuất"
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
                Log In
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="navbar-btn-register"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

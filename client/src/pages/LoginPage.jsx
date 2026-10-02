import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const LoginPage = () => {
  return (
    <div className="page-card-sm">
      <h2 className="page-header-title" style={{ textAlign: 'center' }}>Đăng nhập (Login Skeleton)</h2>
      <div style={{ textAlign: 'center' }}>
        <div className="page-placeholder-box">
          Khung form đăng nhập (Email / Mật khẩu)
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Chưa có tài khoản?{' '}
          <Link to={ROUTES.REGISTER} className="page-link-primary">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
};

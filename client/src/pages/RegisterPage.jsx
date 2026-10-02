import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const RegisterPage = () => {
  return (
    <div className="page-card-sm">
      <h2 className="page-header-title" style={{ textAlign: 'center' }}>Đăng ký (Register Skeleton)</h2>
      <div style={{ textAlign: 'center' }}>
        <div className="page-placeholder-box">
          Khung form đăng ký tài khoản mới
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Đã có tài khoản?{' '}
          <Link to={ROUTES.LOGIN} className="page-link-primary">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

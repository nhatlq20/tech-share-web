import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const NotFoundPage = () => {
  return (
    <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '72px', fontWeight: 800, color: '#cbd5e1', lineHeight: 1 }}>404</h1>
      <p style={{ color: '#4b5563', margin: '16px 0 24px 0', fontSize: '16px' }}>Trang bạn tìm kiếm không tồn tại.</p>
      <Link
        to={ROUTES.HOME}
        className="page-btn-primary"
      >
        Về Trang chủ
      </Link>
    </div>
  );
};

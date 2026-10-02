import React from 'react';
import './Pages.css';

export const AdminPage = () => {
  return (
    <div className="page-container">
      <h1 className="page-header-title">Quản trị hệ thống (Admin Skeleton)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
        <div className="page-placeholder-box" style={{ backgroundColor: '#ffffff', margin: 0 }}>
          Khung quản lý người dùng & phê duyệt tài khoản
        </div>
        <div className="page-placeholder-box" style={{ backgroundColor: '#ffffff', margin: 0 }}>
          Khung kiểm duyệt bài đăng thiết bị & thống kê giao dịch
        </div>
      </div>
    </div>
  );
};

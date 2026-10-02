import React from 'react';
import './Pages.css';

export const DashboardPage = () => {
  return (
    <div className="page-container">
      <h1 className="page-header-title">Bảng điều khiển (Dashboard Skeleton)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
        <div className="page-placeholder-box" style={{ backgroundColor: '#ffffff', margin: 0 }}>
          Khung danh sách thiết bị của tôi
        </div>
        <div className="page-placeholder-box" style={{ backgroundColor: '#ffffff', margin: 0 }}>
          Khung lịch sử đặt thuê
        </div>
        <div className="page-placeholder-box" style={{ backgroundColor: '#ffffff', margin: 0 }}>
          Khung thông tin tài khoản & ví
        </div>
      </div>
    </div>
  );
};

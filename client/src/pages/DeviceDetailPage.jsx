import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const DeviceDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="page-container">
      <Link to={ROUTES.EXPLORE} className="page-link-primary" style={{ display: 'inline-block', marginBottom: '16px' }}>
        &larr; Quay lại danh sách
      </Link>
      <h1 className="page-header-title">Chi tiết thiết bị (ID: {id})</h1>
      <div className="page-placeholder-box" style={{ padding: '48px 24px', backgroundColor: '#ffffff' }}>
        <p style={{ fontWeight: 600, color: '#374151', fontSize: '16px' }}>Khung thông tin chi tiết thiết bị & bảng giá thuê</p>
        <p style={{ fontSize: '14px', marginTop: '6px' }}>Thông số kỹ thuật, tình trạng máy, chủ thiết bị, nút đặt thuê</p>
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const CatalogPage = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-header-title">Danh sách thiết bị (Catalog Skeleton)</h1>
      </div>
      <div className="page-placeholder-box" style={{ padding: '48px 24px', backgroundColor: '#ffffff' }}>
        <p style={{ fontWeight: 600, color: '#374151', fontSize: '16px' }}>Khung danh sách thiết bị cho thuê & bộ lọc</p>
        <p style={{ fontSize: '14px', marginTop: '6px' }}>Sẽ tích hợp gọi API từ backend Node.js/Express</p>
        <div style={{ marginTop: '16px' }}>
          <Link
            to={ROUTES.DEVICE_DETAIL_PATH('demo-device-1')}
            className="page-link-primary"
          >
            Xem mẫu chi tiết thiết bị &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

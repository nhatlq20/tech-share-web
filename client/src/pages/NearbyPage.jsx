import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/routes.js';
import './Pages.css';

export const NearbyPage = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-header-title">Thiết bị gần bạn (Nearby Devices)</h1>
      </div>
      <div className="page-placeholder-box" style={{ padding: '48px 24px', backgroundColor: '#ffffff' }}>
        <p style={{ fontWeight: 600, color: '#374151', fontSize: '16px' }}>
          Khung bản đồ tương tác & thiết bị lân cận
        </p>
        <p style={{ fontSize: '14px', marginTop: '6px' }}>
          Bản đồ tương tác OpenStreetMap / Leaflet và định vị trình duyệt sẽ được tích hợp trong các milestone tiếp theo.
        </p>
        <div style={{ marginTop: '16px' }}>
          <Link to={ROUTES.HOME} className="page-link-primary">
            &larr; Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NearbyPage;

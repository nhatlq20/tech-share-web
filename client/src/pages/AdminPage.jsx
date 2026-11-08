import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const AdminPage = () => {
  const location = useLocation();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    // Chuyển toàn bộ luồng sang giao diện EJS Server-Side Rendering
    const token =
      localStorage.getItem('techshare_auth_token') ||
      localStorage.getItem('techshare_token');
    const targetUrl = location.pathname + location.search;
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

    const navigateToAdmin = () => {
      // Nếu URL hiện tại đã là targetUrl, reload để CRA Dev Proxy gửi request lên backend Express EJS
      if (window.location.pathname + window.location.search === targetUrl) {
        window.location.reload();
      } else {
        window.location.assign(targetUrl);
      }
    };

    if (token) {
      // Đồng bộ cookie cho cổng EJS trước khi chuyển hướng
      fetch('/api/auth/sync-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })
        .catch(() => {
          // Fallback gọi trực tiếp backend nếu proxy CRA chưa sẵn sàng
          return fetch(`${apiUrl}/auth/sync-cookie`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          }).catch((err) => {
            console.warn('Sync cookie warning:', err?.message);
          });
        })
        .finally(() => {
          navigateToAdmin();
        });
    } else {
      navigateToAdmin();
    }
  }, [location.pathname, location.search]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'Be Vietnam Pro', sans-serif",
        color: '#286E74',
        backgroundColor: '#F8FAFC',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #E2E8F0',
          borderTopColor: '#67BEC3',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px',
        }}
      ></div>
      <p style={{ fontWeight: 600, fontSize: '15px' }}>
        Đang chuyển sang Cổng Quản trị TechShare (EJS)...
      </p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminPage;

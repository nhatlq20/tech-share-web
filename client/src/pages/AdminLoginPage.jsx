import React, { useEffect } from 'react';

export const AdminLoginPage = () => {
  useEffect(() => {
    // Chuyển hướng trực tiếp sang trang đăng nhập EJS Server-Side Rendered
    window.location.href = '/admin/login';
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Be Vietnam Pro', sans-serif", color: '#286E74', backgroundColor: '#F8FAFC' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#67BEC3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }}></div>
      <p style={{ fontWeight: 600, fontSize: '15px' }}>Loading Admin Sign In (EJS)...</p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLoginPage;

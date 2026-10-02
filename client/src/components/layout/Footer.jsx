import React from 'react';
import './Footer.css';

export const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-brand">
          <img src="/assets/logo.svg" alt="TechShare" className="footer-logo-img" />
          <span>© 2026 TechShare. All rights reserved.</span>
        </div>
        <div className="footer-links">
          <a href="#" className="footer-link">Điều khoản dịch vụ</a>
          <a href="#" className="footer-link">Chính sách bảo mật</a>
          <a href="#" className="footer-link">Liên hệ hỗ trợ</a>
        </div>
      </div>
    </footer>
  );
};

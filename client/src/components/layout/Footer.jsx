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
          <a href="#" className="footer-link">Terms of Service</a>
          <a href="#" className="footer-link">Privacy Policy</a>
          <a href="#" className="footer-link">Support</a>
        </div>
      </div>
    </footer>
  );
};

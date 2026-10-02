import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import './PublicLayout.css';

export const PublicLayout = () => {
  return (
    <div className="public-layout-root">
      <Navbar />
      <main className="public-layout-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

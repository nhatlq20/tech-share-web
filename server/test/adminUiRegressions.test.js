import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import adminPageRoutes from '../src/routes/adminPageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.join(__dirname, '../src/public/css/admin.css');
const dashboardJsPath = path.join(__dirname, '../src/public/js/admin/dashboard.js');
const sidebarEjsPath = path.join(__dirname, '../src/views/admin/partials/sidebar.ejs');
const headerEjsPath = path.join(__dirname, '../src/views/admin/partials/header.ejs');
const dashboardEjsPath = path.join(__dirname, '../src/views/admin/dashboard.ejs');

const JWT_SECRET = 'techshare_mma301_super_secret_jwt_key_2026';
const adminToken = jwt.sign(
  {
    userId: '60d0fe4f5311236168a109ca',
    role: 'admin',
    name: 'Admin Test',
    email: 'admin@techshare.vn',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const setupTestApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../src/views'));
  app.use(express.static(path.join(__dirname, '../src/public')));
  app.use('/admin', adminPageRoutes);
  return app;
};

const makeRequest = (app, options) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqOptions = {
        hostname: 'localhost',
        port: port,
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers || {},
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      });
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
};

test('TC-UI: TechShare Admin EJS UI Regression & Design Restoration Suite', async (t) => {
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const dashboardJs = fs.readFileSync(dashboardJsPath, 'utf8');
  const sidebarEjs = fs.readFileSync(sidebarEjsPath, 'utf8');
  const headerEjs = fs.readFileSync(headerEjsPath, 'utf8');
  const dashboardEjs = fs.readFileSync(dashboardEjsPath, 'utf8');
  const app = setupTestApp();

  await t.test('TC-UI-01: Sidebar links have no unintended underlines', () => {
    assert.ok(
      cssContent.includes('.admin-nav-item') &&
      cssContent.includes('text-decoration: none !important'),
      'admin-nav-item must have text-decoration: none !important'
    );
    assert.ok(
      cssContent.includes('.admin-logo-box') &&
      cssContent.includes('text-decoration: none !important'),
      'admin-logo-box must have text-decoration: none !important'
    );
    assert.ok(
      cssContent.includes('.admin-footer-btn') &&
      cssContent.includes('text-decoration: none !important'),
      'admin-footer-btn must have text-decoration: none !important'
    );
  });

  await t.test('TC-UI-02: Sidebar navigation and footer are accessible', () => {
    assert.ok(sidebarEjs.includes('class="admin-nav-list"'), 'sidebar must have admin-nav-list');
    assert.ok(sidebarEjs.includes('class="admin-sidebar-footer"'), 'sidebar must have admin-sidebar-footer');
    assert.ok(sidebarEjs.includes('href="/"'), 'sidebar footer must have link to home/marketplace');
    assert.ok(sidebarEjs.includes('href="/admin/logout"'), 'sidebar footer must have logout link');
  });

  await t.test('TC-UI-03: No unintended double scrollbar or horizontal overflow', () => {
    assert.ok(
      /html,\s*body\s*\{[^}]*overflow:\s*hidden/s.test(cssContent),
      'html, body must have overflow: hidden to prevent double scrollbars'
    );
    assert.ok(
      /\.admin-hub-wrapper\s*\{[^}]*overflow:\s*hidden/s.test(cssContent),
      '.admin-hub-wrapper must have overflow: hidden'
    );
    assert.ok(
      /\.admin-main-wrap\s*\{[^}]*overflow-y:\s*auto/s.test(cssContent),
      '.admin-main-wrap must have overflow-y: auto'
    );
    assert.ok(
      /\.admin-sidebar\s*\{[^}]*flex-shrink:\s*0/s.test(cssContent),
      '.admin-sidebar must have flex-shrink: 0'
    );
    assert.ok(
      /\.admin-nav-list\s*\{[^}]*min-height:\s*0/s.test(cssContent),
      '.admin-nav-list must have min-height: 0 to allow flex shrinking'
    );
    assert.ok(
      /\.admin-sidebar-footer\s*\{[^}]*flex-shrink:\s*0/s.test(cssContent),
      '.admin-sidebar-footer must have flex-shrink: 0'
    );
  });

  await t.test('TC-UI-04: Admin header text is correctly aligned without overlap', () => {
    assert.ok(
      !headerEjs.includes('flexDirection: column'),
      'header.ejs must not contain invalid JSX flexDirection: column inline style'
    );
    assert.ok(
      headerEjs.includes('admin-topbar-profile-chip'),
      'header.ejs must use admin-topbar-profile-chip'
    );
    assert.ok(
      headerEjs.includes('admin-topbar-user-info'),
      'header.ejs must use admin-topbar-user-info'
    );
    assert.ok(
      cssContent.includes('.admin-topbar-user-info') &&
      cssContent.includes('flex-direction: column'),
      'admin-topbar-user-info must have flex-direction: column'
    );
  });

  await t.test('TC-UI-05: Revenue chart initializes without JavaScript errors', () => {
    assert.ok(
      dashboardJs.includes("document.getElementById('overviewRevenueChart')"),
      'dashboard.js must attach to overviewRevenueChart'
    );
    assert.ok(
      dashboardJs.includes('chartInstance.destroy()'),
      'dashboard.js must properly destroy existing chart instances before re-render'
    );
  });

  await t.test('TC-UI-06: Revenue chart uses actual backend data and handles zeros gracefully', () => {
    assert.ok(
      dashboardEjs.includes('window.__OVERVIEW_CHART_DATA__'),
      'dashboard.ejs must bind window.__OVERVIEW_CHART_DATA__'
    );
    assert.ok(
      dashboardJs.includes('hasValidData'),
      'dashboard.js must check for valid populated data store'
    );
    assert.ok(
      dashboardJs.includes("if (val === 0) return '0 ₫'") ||
      dashboardJs.includes("if (val === 0) return '0"),
      'dashboard.js must format 0 properly instead of repeating 0M'
    );
  });

  await t.test('TC-UI-07: Chart date filters work (7d, month, year)', () => {
    assert.ok(
      dashboardEjs.includes('data-range="7d"') &&
      dashboardEjs.includes('data-range="month"') &&
      dashboardEjs.includes('data-range="year"'),
      'dashboard.ejs must include buttons for 7d, month, and year'
    );
    assert.ok(
      dashboardJs.includes('.btn-time-range'),
      'dashboard.js must bind click listeners for .btn-time-range'
    );
    assert.ok(
      dashboardJs.includes('renderChart(range)'),
      'dashboard.js must invoke renderChart with the selected range'
    );
  });

  await t.test('TC-UI-08: KPI cards preserve the original layout', () => {
    assert.ok(
      dashboardEjs.includes('class="admin-kpi-grid"'),
      'dashboard.ejs must use admin-kpi-grid class'
    );
    assert.ok(
      dashboardEjs.includes('admin-kpi-card'),
      'dashboard.ejs must use admin-kpi-card class'
    );
  });

  await t.test('TC-UI-09: Device allocation panel renders correctly', () => {
    assert.ok(
      /(?:Phân bổ Danh mục|Category Distribution)/.test(dashboardEjs),
      'dashboard.ejs must render Category Allocation title'
    );
    assert.ok(
      dashboardEjs.includes('cats.forEach'),
      'dashboard.ejs must loop through device categories with progress bars'
    );
  });

  await t.test('TC-UI-10: Responsive layout works at desktop, tablet, and mobile widths', () => {
    assert.ok(
      cssContent.includes('@media (max-width: 1200px)'),
      'admin.css must include breakpoint for 1200px'
    );
    assert.ok(
      cssContent.includes('@media (max-width: 1024px)'),
      'admin.css must include breakpoint for 1024px'
    );
    assert.ok(
      cssContent.includes('@media (max-width: 640px)'),
      'admin.css must include breakpoint for 640px'
    );
  });

  await t.test('TC-UI-11: Existing Admin navigation and actions remain functional', () => {
    const requiredRoutes = [
      '/admin/dashboard',
      '/admin/analytics',
      '/admin/user-manager',
      '/admin/device-moderation',
      '/admin/booking-management',
      '/admin/review-moderation',
      '/admin/ekyc-verification',
      '/admin/notification-management',
      '/admin/settings',
    ];

    for (const route of requiredRoutes) {
      assert.ok(
        sidebarEjs.includes(`href="${route}"`),
        `sidebar.ejs must contain navigation link to ${route}`
      );
    }
  });

  await t.test('TC-UI-12: Server returns HTTP 200 and renders EJS dashboard with cookie', async () => {
    const res = await makeRequest(app, {
      path: '/admin/dashboard',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.ok(/(?:Tổng quan & Chỉ số Vận hành|Overview & Operational Metrics)/.test(res.body));
    assert.ok(res.body.includes('overviewRevenueChart'));
    assert.ok(res.body.includes('admin-topbar-profile-chip'));
    assert.ok(!res.body.includes('flexDirection: column'));
  });

  await t.test('TC-UI-13: Admin Profile Card is removed from sidebar while preserving logo and topbar profile', async () => {
    // 1. Sidebar markup must NOT have admin-profile-badge-wrap
    assert.ok(
      !sidebarEjs.includes('admin-profile-badge-wrap'),
      'sidebar.ejs must not contain admin-profile-badge-wrap'
    );
    assert.ok(
      !sidebarEjs.includes('admin-profile-avatar'),
      'sidebar.ejs must not contain admin-profile-avatar'
    );
    // 2. Sidebar must still have TechShare logo and branding
    assert.ok(
      sidebarEjs.includes('admin-logo-box'),
      'sidebar.ejs must preserve admin-logo-box'
    );
    assert.ok(
      sidebarEjs.includes('ADMIN'),
      'sidebar.ejs must preserve ADMIN brand label'
    );
    // 3. Topbar header must still contain admin profile chip
    assert.ok(
      headerEjs.includes('admin-topbar-profile-chip'),
      'header.ejs must preserve admin-topbar-profile-chip'
    );
    assert.ok(
      headerEjs.includes('admin-topbar-name'),
      'header.ejs must preserve admin-topbar-name'
    );
  });
});

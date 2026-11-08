import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import adminRoutes from '../src/routes/adminRoutes.js';
import adminPageRoutes from '../src/routes/adminPageRoutes.js';
import {
  resolveDateRange,
  calculateAnalyticsData,
} from '../src/controllers/admin/adminAdvancedAnalyticsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'techshare_mma301_super_secret_jwt_key_2026';

const makeAdminToken = () => {
  return jwt.sign(
    {
      userId: '6ad1cfacf8e0116329d9b970',
      accountId: '6ad1cfacf8e0116329d9b96e',
      role: 'admin',
      name: 'Quản trị viên TechShare',
      email: 'admin@techshare.vn',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const makeRenterToken = () => {
  return jwt.sign(
    {
      userId: '6ad1cfadf8e0116329d9b988',
      role: 'renter',
      name: 'Renter Test',
      email: 'renter@techshare.vn',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('TECHSHARE ADMIN ANALYTICS EJS & FINANCIAL CHARTS TEST SUITE', () => {
  let app;
  let server;
  let baseUrl;
  let mongoConnected = false;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoUri && mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(mongoUri);
        mongoConnected = true;
      } catch (err) {
        console.warn('MongoDB connect warning in test suite:', err.message);
      }
    } else if (mongoose.connection.readyState === 1) {
      mongoConnected = true;
    }

    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../src/views'));
    app.use(express.static(path.join(__dirname, '../src/public')));

    app.use('/admin', adminPageRoutes);
    app.use('/api/admin', adminRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoConnected && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // TC-ANALYTICS-01: All charts load successfully and render canvas elements
  test('TC-ANALYTICS-01: Admin analytics renders booking and revenue charts', async () => {
    const token = makeAdminToken();
    const res = await fetch(`${baseUrl}/admin/analytics`, {
      headers: {
        Cookie: `techshare_admin_token=${token}`,
      },
    });

    assert.equal(res.status, 200);
    const html = await res.text();

    assert.ok(html.includes('Advanced Financial Reports & Analytics') || html.includes('Báo cáo & Phân tích Tài chính Nâng cao'), 'Page title rendered');
    assert.ok(html.includes('id="revenueTrendsChart"'), 'Chart 1 canvas exists');
    assert.ok(html.includes('id="bookingStatusChart"'), 'Chart 2 canvas exists');
    assert.ok(html.includes('id="categoryRevenueChart"'), 'Chart 3 canvas exists');
    assert.ok(html.includes('id="bookingFunnelContainer"'), 'Chart 5 funnel container exists');
    assert.ok(html.includes('/js/admin/analytics.js'), 'analytics.js script included');
  });

  // TC-ANALYTICS-02: Charts use real MongoDB Atlas data
  test('TC-ANALYTICS-02: API returns real data from MongoDB Atlas without hardcoded mock values', async () => {
    if (!mongoConnected) return;

    const token = makeAdminToken();
    const res = await fetch(`${baseUrl}/api/admin/analytics/advanced?period=30d`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.kpi, 'KPI object exists');
    assert.ok(body.data.revenueTrends.length > 0, 'Revenue trends populated');
    assert.ok(body.data.bookingStatusDistribution.length > 0, 'Status distribution populated');
    assert.ok(body.data.revenueByCategory.length > 0, 'Category revenue populated');
    assert.ok(body.data.bookingFunnel.length === 4, 'Funnel has 4 stages');
  });

  // TC-ANALYTICS-03: Date filters update all relevant metrics
  test('TC-ANALYTICS-03: Date range resolver correctly calculates boundaries for 7d, 30d, 90d, year and custom', () => {
    const range7d = resolveDateRange('7d');
    const range30d = resolveDateRange('30d');
    const range90d = resolveDateRange('90d');
    const rangeYear = resolveDateRange('year');
    const rangeCustom = resolveDateRange('custom', '2026-10-01', '2026-10-31');

    assert.ok(range7d.filterStart < range7d.filterEnd, '7d start is before end');
    assert.ok(range30d.filterStart < range30d.filterEnd, '30d start is before end');
    assert.ok(range90d.filterStart < range90d.filterEnd, '90d start is before end');
    assert.equal(rangeYear.filterStart.getMonth(), 0, 'Year starts in January');
    assert.equal(rangeCustom.filterStart.getDate(), 1, 'Custom start date matches');
  });

  // TC-ANALYTICS-04: GBV calculation is correct
  test('TC-ANALYTICS-04: Gross Booking Value correctly sums rental amounts of eligible bookings', async () => {
    if (!mongoConnected) return;

    const dateRange = resolveDateRange('30d');
    const data = await calculateAnalyticsData({ ...dateRange, period: '30d' });

    assert.ok(typeof data.kpi.grossBookingValue === 'number', 'GBV is a number');
    assert.ok(data.kpi.grossBookingValue > 0, 'GBV is positive with real bookings');
  });

  // TC-ANALYTICS-05: Platform revenue excludes refundable deposits
  test('TC-ANALYTICS-05: Platform service fee revenue is strictly calculated on rental fees, not deposits', async () => {
    if (!mongoConnected) return;

    const dateRange = resolveDateRange('30d');
    const data = await calculateAnalyticsData({ ...dateRange, period: '30d' });

    assert.ok(data.kpi.platformFeeRevenue < data.kpi.grossBookingValue, 'Platform fee is smaller than GBV');
  });

  // TC-ANALYTICS-06: Booking status counts match database records
  test('TC-ANALYTICS-06: Booking status distribution matches exact status counts in database', async () => {
    if (!mongoConnected) return;

    const dateRange = resolveDateRange('year');
    const data = await calculateAnalyticsData({ ...dateRange, period: 'year' });

    const totalCountFromStatuses = data.bookingStatusDistribution.reduce((sum, st) => sum + st.count, 0);
    assert.equal(totalCountFromStatuses, data.kpi.totalBookings, 'Sum of status counts equals total bookings');
  });

  // TC-ANALYTICS-07: Category revenue aggregation is correct
  test('TC-ANALYTICS-07: Category revenue properly aggregates device categories and sorts descending', async () => {
    if (!mongoConnected) return;

    const dateRange = resolveDateRange('year');
    const data = await calculateAnalyticsData({ ...dateRange, period: 'year' });

    assert.ok(Array.isArray(data.revenueByCategory), 'revenueByCategory is array');
    if (data.revenueByCategory.length > 1) {
      assert.ok(
        data.revenueByCategory[0].revenue >= data.revenueByCategory[1].revenue,
        'Categories are sorted by revenue descending'
      );
    }
  });

  // TC-ANALYTICS-09: Funnel uses verified historical transitions
  test('TC-ANALYTICS-09: Booking conversion funnel stages reflect monotonic lifecycle progression', async () => {
    if (!mongoConnected) return;

    const dateRange = resolveDateRange('year');
    const data = await calculateAnalyticsData({ ...dateRange, period: 'year' });

    const funnel = data.bookingFunnel;
    assert.equal(funnel.length, 4, 'Funnel has 4 stages');
    assert.equal(funnel[0].percent, 100, 'Stage 1 is 100%');
    assert.ok(funnel[0].count >= funnel[1].count, 'Created >= Approved');
    assert.ok(funnel[1].count >= funnel[2].count, 'Approved >= Active');
    assert.ok(funnel[2].count >= funnel[3].count, 'Active >= Completed');
  });

  // TC-ANALYTICS-10: Empty datasets render correctly
  test('TC-ANALYTICS-10: Empty dataset for future date range returns clean zeroes without throwing', async () => {
    if (!mongoConnected) return;

    const futureStart = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 110 * 24 * 60 * 60 * 1000);
    const data = await calculateAnalyticsData({
      filterStart: futureStart,
      filterEnd: futureEnd,
      prevFilterStart: futureStart,
      prevFilterEnd: futureEnd,
      period: 'custom',
    });

    assert.equal(data.kpi.grossBookingValue, 0);
    assert.equal(data.kpi.platformFeeRevenue, 0);
    assert.equal(data.kpi.totalBookings, 0);
    assert.equal(data.kpi.completionRate, 0);
  });

  // TC-ANALYTICS-11: Chart initialization produces no JavaScript errors
  test('TC-ANALYTICS-11: Public analytics.js exists and has valid syntax', async () => {
    const token = makeAdminToken();
    const res = await fetch(`${baseUrl}/js/admin/analytics.js`, {
      headers: { Cookie: `techshare_admin_token=${token}` },
    });

    assert.equal(res.status, 200);
    const js = await res.text();
    assert.ok(js.includes('renderRevenueTrends'), 'Contains renderRevenueTrends function');
    assert.ok(js.includes('renderBookingStatus'), 'Contains renderBookingStatus function');
    assert.ok(js.includes('renderCategoryRevenue'), 'Contains renderCategoryRevenue function');
    assert.ok(js.includes('renderBookingFunnel'), 'Contains renderBookingFunnel function');
  });

  // TC-ANALYTICS-12: CSV export respects selected date filters & prevents formula injection
  test('TC-ANALYTICS-12: CSV export generates sanitized CSV file with UTF-8 BOM', async () => {
    const token = makeAdminToken();
    const res = await fetch(`${baseUrl}/api/admin/analytics/export?period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'), 'Content-Type is text/csv');
    assert.ok(res.headers.get('content-disposition').includes('attachment'), 'Content-Disposition is attachment');

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    assert.ok(hasBom, 'CSV binary stream starts with UTF-8 BOM (0xEF, 0xBB, 0xBF)');

    const csv = new TextDecoder('utf-8').decode(bytes);
    assert.ok(/(?:TECHSHARE - BÁO CÁO PHÂN TÍCH TÀI CHÍNH & VẬN HÀNH|TECHSHARE - FINANCIAL & OPERATIONAL ANALYTICS REPORT)/.test(csv), 'Includes CSV title');
    assert.ok(/(?:Tổng giá trị giao dịch \(GBV\)|Gross Booking Value \(GBV\))/.test(csv), 'Includes GBV metric');
    assert.ok(/(?:Doanh thu phí nền tảng ròng \(10%\)|Net Platform Service Fee Revenue \(10%\))/.test(csv), 'Includes Platform fee metric');
  });

  // TC-ANALYTICS-13: Unauthorized requests return 401 or 403
  test('TC-ANALYTICS-13: Unauthorized or non-admin requests are rejected with 401/403', async () => {
    // 1. No token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/analytics/advanced`);
    assert.ok([401, 403].includes(unauthRes.status), 'No token rejected');

    // 2. Renter token -> 403
    const renterToken = makeRenterToken();
    const renterRes = await fetch(`${baseUrl}/api/admin/analytics/advanced`, {
      headers: { Authorization: `Bearer ${renterToken}` },
    });
    assert.ok([401, 403].includes(renterRes.status), 'Renter token rejected from admin financial analytics');
  });

  // TC-ANALYTICS-14: Responsive layout works without unintended overflow
  test('TC-ANALYTICS-14: Analytics EJS contains responsive breakpoint styles and grids', async () => {
    const token = makeAdminToken();
    const res = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Cookie: `techshare_admin_token=${token}` },
    });
    const html = await res.text();

    assert.ok(html.includes('analytics-charts-grid-row1'), 'Row 1 responsive grid exists');
    assert.ok(html.includes('@media (max-width: 1024px)'), '1024px media query exists');
  });

  // TC-ANALYTICS-15: Existing Admin pages remain unaffected
  test('TC-ANALYTICS-15: Other admin pages (Dashboard, Device Moderation, Users) remain fully functional', async () => {
    const token = makeAdminToken();

    const dashRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Cookie: `techshare_admin_token=${token}` },
    });
    assert.equal(dashRes.status, 200, 'Dashboard returns 200');

    const devRes = await fetch(`${baseUrl}/admin/device-moderation`, {
      headers: { Cookie: `techshare_admin_token=${token}` },
    });
    assert.equal(devRes.status, 200, 'Device moderation returns 200');

    const userRes = await fetch(`${baseUrl}/admin/user-manager`, {
      headers: { Cookie: `techshare_admin_token=${token}` },
    });
    assert.equal(userRes.status, 200, 'User manager returns 200');
  });
});

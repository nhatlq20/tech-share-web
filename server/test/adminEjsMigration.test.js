import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import adminPageRoutes from '../src/routes/adminPageRoutes.js';
import { OwnerEkycRequest } from '../src/models/OwnerEkycRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'techshare_mma301_super_secret_jwt_key_2026';

const createAdminToken = (role = 'admin') => {
  return jwt.sign(
    {
      userId: '64e0a12f9b1c2b001a111111',
      accountId: '64e0a12f9b1c2b001a222222',
      name: 'Super Admin Test',
      email: 'admin.test@techshare.vn',
      username: 'superadmin',
      role: role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Create test express app
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
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          server.close(() => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
            });
          });
        });
      });

      req.on('error', (err) => {
        server.close(() => reject(err));
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
};

test('ADMIN EJS MIGRATION: Security & Server-Rendered Views Test Suite', async (t) => {
  const app = setupTestApp();
  const adminToken = createAdminToken('admin');
  const renterToken = createAdminToken('renter');

  await t.test('Owner verification keeps both protected admin routes after the merge', async (t) => {
    const pending = { status: 'pending' };
    const record = {
      _id: '64e0a12f9b1c2b001a333333',
      fullName: 'Owner Applicant',
      status: 'pending',
      idCardFrontUrl: 'https://example.test/front.jpg',
      idCardBackUrl: 'https://example.test/back.jpg',
      idCardHoldingUrl: 'https://example.test/holding.jpg',
    };
    const query = {
      populate() { return this; },
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      lean: async () => [record],
    };
    const find = t.mock.method(OwnerEkycRequest, 'find', (filter) => {
      assert.deepEqual(filter, pending);
      return query;
    });
    t.mock.method(OwnerEkycRequest, 'countDocuments', async () => 1);

    const anonymous = await makeRequest(app, { path: '/admin/owner-ekyc-verification' });
    assert.equal(anonymous.statusCode, 302);
    const renter = await makeRequest(app, {
      path: '/admin/owner-ekyc',
      headers: { Cookie: `techshare_admin_token=${renterToken}` },
    });
    assert.equal(renter.statusCode, 403);
    assert.equal(find.mock.callCount(), 0);

    for (const path of ['/admin/owner-ekyc-verification', '/admin/owner-ekyc']) {
      const admin = await makeRequest(app, {
        path: `${path}?status=pending`,
        headers: { Cookie: `techshare_admin_token=${adminToken}` },
      });
      assert.equal(admin.statusCode, 200);
      assert.equal(admin.headers['cache-control'], 'no-store');
      assert.match(admin.body, /Owner Applicant/);
      assert.match(admin.body, /front\.jpg/);
      assert.match(admin.body, /back\.jpg/);
      assert.match(admin.body, /holding\.jpg/);
      assert.match(admin.body, /data-owner-ekyc-review/);
    }
  });

  await t.test('TC-EJS-AUTH-01: GET /admin/login renders login page with 200 OK', async () => {
    const res = await makeRequest(app, { path: '/admin/login' });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Admin Sign In/i);
    assert.match(res.body, /Username or Email/i);
    assert.match(res.body, /Password/i);
  });

  await t.test('TC-EJS-AUTH-02: Unauthenticated GET /admin/user-manager redirects to /admin/login', async () => {
    const res = await makeRequest(app, { path: '/admin/user-manager' });
    assert.equal(res.statusCode, 302);
    assert.match(res.headers.location, /\/admin\/login\?redirect=%2Fadmin%2Fuser-manager/);
  });

  await t.test('TC-EJS-AUTH-03: Unauthenticated GET /admin/dashboard redirects to /admin/login', async () => {
    const res = await makeRequest(app, { path: '/admin/dashboard' });
    assert.equal(res.statusCode, 302);
    assert.match(res.headers.location, /\/admin\/login\?redirect=%2Fadmin%2Fdashboard/);
  });

  await t.test('TC-EJS-AUTH-04: Non-admin token in cookie receives 403 Forbidden', async () => {
    const res = await makeRequest(app, {
      path: '/admin/user-manager',
      headers: {
        Cookie: `techshare_admin_token=${renterToken}`,
      },
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.body, /Truy cập bị từ chối/);
  });

  await t.test('TC-EJS-AUTH-05: Non-admin token in Authorization header receives 403 Forbidden', async () => {
    const res = await makeRequest(app, {
      path: '/admin/user-manager',
      headers: {
        Authorization: `Bearer ${renterToken}`,
      },
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.body, /Truy cập bị từ chối/);
  });

  await t.test('TC-EJS-AUTH-06: GET /admin/logout clears auth cookie and redirects to login', async () => {
    const res = await makeRequest(app, { path: '/admin/logout' });
    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, '/admin/login');
  });

  await t.test('TC-EJS-PAGE-01: Admin GET /admin/user-manager renders User Management reference page with exact table & layout', async () => {
    const res = await makeRequest(app, {
      path: '/admin/user-manager',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    // Verify Layout elements
    assert.match(res.body, /admin-hub-wrapper/);
    assert.match(res.body, /admin-sidebar/);
    assert.match(res.body, /Tech<span>Share<\/span>/);
    assert.match(res.body, /admin-topbar/);

    // Verify User Management specific elements
    assert.match(res.body, /Quản lý Người dùng & Tín nhiệm/);
    assert.match(res.body, /Thành viên & Liên hệ/);
    assert.match(res.body, /Điểm tín nhiệm/);
    assert.match(res.body, /userSearchInput/);
    assert.match(res.body, /roleFilterSelect/);
    assert.match(res.body, /statusFilterSelect/);
    assert.match(res.body, /lockConfirmModal/);
    assert.match(res.body, /userDetailModal/);
  });

  await t.test('TC-EJS-PAGE-02: Admin GET /admin/dashboard renders KPI cards & Chart container', async () => {
    const res = await makeRequest(app, {
      path: '/admin/dashboard',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Tổng quan & Chỉ số Vận hành/);
    assert.match(res.body, /Tổng thành viên/);
    assert.match(res.body, /Thiết bị niêm yết/);
    assert.match(res.body, /overviewRevenueChart/);
    assert.match(res.body, /Phân bổ Danh mục/);
  });

  await t.test('TC-EJS-PAGE-03: Admin GET /admin/device-moderation renders device moderation page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/device-moderation',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Kiểm duyệt Thiết bị Niêm yết/);
    assert.match(res.body, /deviceSearchInput/);
    assert.match(res.body, /deviceModerateModal/);
  });

  await t.test('TC-EJS-PAGE-04: Admin GET /admin/ekyc-verification renders eKYC verification page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/ekyc-verification',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Xác minh Danh tính Điện tử \(eKYC\)/);
    assert.match(res.body, /ekycModal/);
  });

  await t.test('TC-EJS-PAGE-05: Admin GET /admin/booking-management renders bookings page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/booking-management',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Quản lý Đơn thuê Thiết bị/);
    assert.match(res.body, /bookingSearchInput/);
  });

  await t.test('TC-EJS-PAGE-06: Admin GET /admin/dispute-resolution renders dispute resolution page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/dispute-resolution',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Giải quyết Khiếu nại & Tranh chấp Cọc/);
    assert.match(res.body, /resolveDisputeModal/);
  });

  await t.test('TC-EJS-PAGE-07: Admin GET /admin/wallet renders platform wallet & escrow liabilities', async () => {
    const res = await makeRequest(app, {
      path: '/admin/wallet',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Giám sát Ví & Giao dịch Tài chính Escrow/);
    assert.match(res.body, /Escrow Liabilities/);
  });

  await t.test('TC-EJS-PAGE-08: Admin GET /admin/voucher-management renders vouchers page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/voucher-management',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Quản lý Mã Giảm giá & Khuyến mãi \(Voucher\)/);
    assert.match(res.body, /createVoucherModal/);
  });

  await t.test('TC-EJS-PAGE-09: Admin GET /admin/review-moderation renders review moderation page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/review-moderation',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Kiểm duyệt Đánh giá & Bảo vệ Uy tín/);
  });

  await t.test('TC-EJS-PAGE-10: Admin GET /admin/roles-permissions renders roles & RBAC page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/roles-permissions',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Phân quyền & Quản lý Vai trò \(Roles & RBAC\)/);
    assert.match(res.body, /reassignRoleModal/);
  });

  await t.test('TC-EJS-PAGE-11: Admin GET /admin/notification-management renders notification broadcast page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/notification-management',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Quản lý & Phát sóng Thông báo/);
    assert.match(res.body, /broadcastModal/);
  });

  await t.test('TC-EJS-PAGE-12: Admin GET /admin/analytics renders advanced analytics page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/analytics',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Báo cáo & Phân tích Tài chính Nâng cao/);
    assert.match(res.body, /Gross Booking Value/);
  });

  await t.test('TC-EJS-PAGE-13: Admin GET /admin/settings renders system settings page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/settings',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Cấu hình Tham số Nền tảng \(System Settings\)/);
    assert.match(res.body, /editSettingModal/);
  });

  await t.test('TC-EJS-PAGE-14: Admin GET /admin/audit-logs renders centralized audit logs page', async () => {
    const res = await makeRequest(app, {
      path: '/admin/audit-logs',
      headers: {
        Cookie: `techshare_admin_token=${adminToken}`,
      },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Nhật ký Kiểm toán Hệ thống \(Audit Logs\)/);
  });

  await t.test('TC-EJS-STATIC-01: GET /css/admin.css returns 200 with CSS content', async () => {
    const res = await makeRequest(app, { path: '/css/admin.css' });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /--admin-primary/);
    assert.match(res.body, /admin-hub-wrapper/);
  });

  await t.test('TC-EJS-STATIC-02: GET /js/admin/user-manager.js returns 200 with JS client code', async () => {
    const res = await makeRequest(app, { path: '/js/admin/user-manager.js' });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /userSearchInput/);
    assert.match(res.body, /btn-toggle-status/);
  });
});

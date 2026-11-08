import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import mongoose from 'mongoose';
import { getDeviceById } from '../src/controllers/deviceController.js';
import { getBookingById } from '../src/controllers/bookingController.js';
import { protect } from '../src/middlewares/authMiddleware.js';
import { requireOwner } from '../src/middlewares/roleMiddleware.js';
import Device from '../src/models/Device.js';
import Booking from '../src/models/Booking.js';
import User from '../src/models/User.js';

// Mock helper for Express response
function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Device & Booking Detail Feature Unit Tests (All 8 Requirements)', () => {
  // --------------------------------------------------------------------------
  // Case 1: Lấy Detail với ID hợp lệ
  // --------------------------------------------------------------------------
  test('Case 1: Lấy Detail với ID hợp lệ trả về status 200 và dữ liệu chi tiết', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const originalFindOne = Device.findOne;

    // Giả lập dữ liệu trả về từ MongoDB
    Device.findOne = () => ({
      populate() {
        return this;
      },
      lean() {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(validId),
          name: 'Sony Alpha A7 IV',
          brand: 'Sony',
          category: 'camera',
          pricePerDay: 250000,
          ownerId: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Nguyen Van A',
            email: 'owner@techshare.vn',
            address: '123 Ba Dinh, Hanoi',
            location: {
              type: 'Point',
              coordinates: [105.8542, 21.0285],
            },
          },
        });
      },
    });

    try {
      const req = { params: { id: validId } };
      const res = createMockRes();
      let nextError = null;

      await getDeviceById(req, res, (err) => { nextError = err; });

      assert.equal(nextError, null, 'Không được có lỗi next(error)');
      assert.equal(res.statusCode, 200, 'HTTP status phải là 200 OK');
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Sony Alpha A7 IV');
      assert.ok(res.body.data.location, 'Dữ liệu phải có trường location');
      assert.deepEqual(res.body.data.location.coordinates, [105.8542, 21.0285]);
    } finally {
      Device.findOne = originalFindOne;
    }
  });

  // --------------------------------------------------------------------------
  // Case 2: Lấy Detail với ID không tồn tại
  // --------------------------------------------------------------------------
  test('Case 2: Lấy Detail với ID không tồn tại trả về status 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const originalFindOne = Device.findOne;

    // Giả lập không tìm thấy document trong DB
    Device.findOne = () => ({
      populate() {
        return this;
      },
      lean() {
        return Promise.resolve(null);
      },
    });

    try {
      const req = { params: { id: nonExistentId } };
      const res = createMockRes();

      await getDeviceById(req, res, () => {});

      assert.equal(res.statusCode, 404, 'HTTP status phải là 404 Not Found');
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Device not found');
    } finally {
      Device.findOne = originalFindOne;
    }
  });

  // --------------------------------------------------------------------------
  // Case 3: Lấy Detail với ID sai định dạng
  // --------------------------------------------------------------------------
  test('Case 3: Lấy Detail với ID sai định dạng ObjectId trả về status 400', async () => {
    const invalidIds = ['123', 'invalid-id', 'abc', '64e0a12f9b1c2b001a99999Z'];

    for (const invalidId of invalidIds) {
      const req = { params: { id: invalidId } };
      const res = createMockRes();

      await getDeviceById(req, res, () => {});

      assert.equal(res.statusCode, 400, `ID "${invalidId}" phải trả về 400`);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid device ID');
    }
  });

  // --------------------------------------------------------------------------
  // Case 4: Thiếu ID hoặc ID trùng với route tĩnh ("nearby", "owner")
  // --------------------------------------------------------------------------
  test('Case 4: Thiếu ID hoặc ID là từ khóa cố định trả về status 400', async () => {
    const specialKeywords = ['', 'nearby', 'owner'];

    for (const kw of specialKeywords) {
      const req = { params: { id: kw } };
      const res = createMockRes();

      await getDeviceById(req, res, () => {});

      assert.equal(res.statusCode, 400, `Keyword "${kw}" phải trả về 400`);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid device ID');
    }
  });

  // --------------------------------------------------------------------------
  // Case 5: Dữ liệu có các relationship và populate
  // --------------------------------------------------------------------------
  test('Case 5: Dữ liệu trả về có đầy đủ thông tin Owner được populate và vị trí động', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const ownerObjId = new mongoose.Types.ObjectId();
    const originalFindOne = Device.findOne;

    Device.findOne = () => ({
      populate(field, projection) {
        if (field === 'ownerId') {
          assert.equal(projection, 'name email phone avatar address location');
        }
        return this;
      },
      lean() {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(validId),
          name: 'MacBook Pro M3 Max',
          ownerId: {
            _id: ownerObjId,
            name: 'Tran Thi B',
            email: 'tranthib@techshare.vn',
            address: '456 Ninh Kieu, Can Tho',
            location: {
              type: 'Point',
              coordinates: [105.7469, 10.0452],
            },
          },
        });
      },
    });

    try {
      const req = { params: { id: validId } };
      const res = createMockRes();

      await getDeviceById(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.data.ownerId.name, 'Tran Thi B');
      assert.equal(res.body.data.address, '456 Ninh Kieu, Can Tho');
      assert.deepEqual(res.body.data.location.coordinates, [105.7469, 10.0452]);
    } finally {
      Device.findOne = originalFindOne;
    }
  });

  // --------------------------------------------------------------------------
  // Case 6: Người dùng chưa đăng nhập khi gọi API yêu cầu Authentication
  // --------------------------------------------------------------------------
  test('Case 6: Người dùng chưa đăng nhập khi gọi middleware protect trả về status 401', async () => {
    const req = {
      headers: {},
      cookies: {},
    };
    const res = createMockRes();

    await protect(req, res, () => {});

    assert.equal(res.statusCode, 401, 'Chưa đăng nhập phải trả về 401 Unauthorized');
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('đăng nhập'));
  });

  // --------------------------------------------------------------------------
  // Case 7: Người dùng không đủ quyền khi gọi API có Phân quyền (Authorization)
  // --------------------------------------------------------------------------
  test('Case 7: Người dùng có role renter khi gọi requireOwner bị từ chối 403 Forbidden', () => {
    const req = {
      user: { role: 'renter' },
    };
    const res = createMockRes();
    let nextCalled = false;

    requireOwner(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'Không được cho phép đi tiếp vào controller');
    assert.equal(res.statusCode, 403, 'Không có quyền Owner phải trả về 403 Forbidden');
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Owner'));
  });

  test('Case 7 (bổ sung): Người dùng không phải Renter, Owner hoặc Admin bị từ chối 403 khi xem đơn thuê', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const renterId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const attackerId = new mongoose.Types.ObjectId(); // Người lạ

    const originalBookingFindOne = Booking.findOne;
    const originalUserFind = User.find;

    // Mock User.find để tránh timeout khi không có kết nối DB
    User.find = () => ({
      select() { return this; },
      lean() { return Promise.resolve([]); },
    });

    Booking.findOne = () => ({
      select() { return this; },
      populate() { return this; },
      lean() {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(bookingId),
          bookingCode: 'BK-TEST-123',
          renterId,
          ownerId,
          status: 'pending',
        });
      },
    });

    try {
      const req = {
        params: { id: bookingId },
        user: { userId: attackerId.toString(), role: 'renter' }, // Người lạ truy cập
      };
      const res = createMockRes();

      await getBookingById(req, res, () => {});

      assert.equal(res.statusCode, 403, 'Người lạ không có quyền xem đơn thuê phải bị 403');
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('permission'));
    } finally {
      Booking.findOne = originalBookingFindOne;
      User.find = originalUserFind;
    }
  });

  // --------------------------------------------------------------------------
  // Case 8: Database xảy ra lỗi (Error Handling)
  // --------------------------------------------------------------------------
  test('Case 8: Khi Database gặp lỗi, controller bắt lỗi và chuyển sang next(error)', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const originalFindOne = Device.findOne;
    const dbError = new Error('MongoDB connection lost');

    Device.findOne = () => {
      throw dbError;
    };

    try {
      const req = { params: { id: validId } };
      const res = createMockRes();
      let capturedError = null;

      await getDeviceById(req, res, (err) => {
        capturedError = err;
      });

      assert.equal(capturedError, dbError, 'Lỗi phải được chuyển vào next(error)');
    } finally {
      Device.findOne = originalFindOne;
    }
  });
});

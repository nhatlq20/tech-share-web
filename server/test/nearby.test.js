import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, describe } from 'node:test';
import mongoose from 'mongoose';
import { getNearbyDevices } from '../src/controllers/deviceController.js';

let originalDb, pipeline, mockAggregateResult, dbError;

beforeEach(() => {
  originalDb = mongoose.connection.db;
  pipeline = null;
  dbError = null;
  mockAggregateResult = [{ data: [], totals: [] }];

  mongoose.connection.db = {
    collection: (name) => {
      assert.equal(name, 'users');
      return {
        aggregate(stages) {
          pipeline = stages;
          return {
            toArray: async () => {
              if (dbError) throw dbError;
              return mockAggregateResult;
            },
          };
        },
      };
    },
  };
});

afterEach(() => {
  mongoose.connection.db = originalDb;
});

async function request(query = {}, skipDefaultCoords = false) {
  const result = {};
  const res = {
    status(value) {
      result.status = value;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };

  const finalQuery = skipDefaultCoords
    ? query
    : { lat: '21.0285', lng: '105.8542', ...query };

  let nextError = null;
  await getNearbyDevices({ query: finalQuery }, res, (err) => {
    nextError = err;
  });

  result.error = nextError;
  return result;
}

describe('Map Feature Unit Tests (All 10 Requirements)', () => {
  // Case 1: Lấy danh sách địa điểm trên bản đồ
  test('Case 1: Lấy danh sách địa điểm trên bản đồ thành công (HTTP 200 OK)', async () => {
    const res = await request();
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  // Case 2: Tìm kiếm địa điểm với tọa độ hợp lệ
  test('Case 2: Tìm kiếm địa điểm với tọa độ hợp lệ trả về đúng kết quả', async () => {
    const res = await request({ lat: '10.0452', lng: '105.7469' });
    assert.equal(res.status, 200);
    const geo = pipeline[0].$geoNear;
    assert.deepEqual(geo.near.coordinates, [105.7469, 10.0452]);
  });

  // Case 3: Tìm kiếm với Latitude không hợp lệ
  test('Case 3: Tìm kiếm với Latitude không hợp lệ (ngoài khoảng -90 đến 90) trả về 400', async () => {
    for (const invalidLat of ['91', '-95', 'NaN', '']) {
      const res = await request({ lat: invalidLat });
      assert.equal(res.status, 400, `Latitude ${invalidLat} phải bị từ chối 400`);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Valid coordinates, radius, page and limit are required.');
    }
  });

  // Case 4: Tìm kiếm với Longitude không hợp lệ
  test('Case 4: Tìm kiếm với Longitude không hợp lệ (ngoài khoảng -180 đến 180) trả về 400', async () => {
    for (const invalidLng of ['181', '-190', 'Infinity', ' ']) {
      const res = await request({ lng: invalidLng });
      assert.equal(res.status, 400, `Longitude ${invalidLng} phải bị từ chối 400`);
      assert.equal(res.body.success, false);
    }
  });

  // Case 5: Frontend không gửi tọa độ
  test('Case 5: Frontend không gửi tọa độ trả về HTTP 400 Bad Request', async () => {
    const res = await request({}, true); // skipDefaultCoords = true
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Valid coordinates, radius, page and limit are required.');
    assert.equal(pipeline, null, 'Không được gọi database khi thiếu tọa độ');
  });

  // Case 6: Không tìm thấy địa điểm nào
  test('Case 6: Không tìm thấy địa điểm nào trả về count = 0 và mảng rỗng an toàn', async () => {
    mockAggregateResult = [{ data: [], totals: [] }];
    const res = await request();
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.pagination.total, 0);
  });

  // Case 7: Có nhiều địa điểm trong khu vực tìm kiếm
  test('Case 7: Có nhiều địa điểm trong khu vực tìm kiếm trả về danh sách đầy đủ', async () => {
    mockAggregateResult = [{
      data: [
        { _id: 'dev-1', name: 'Camera 1', distanceMeters: 500 },
        { _id: 'dev-2', name: 'Drone 2', distanceMeters: 1200 },
      ],
      totals: [{ total: 2 }],
    }];
    const res = await request();
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.pagination.total, 2);
  });

  // Case 8: Kiểm tra thứ tự Longitude và Latitude chuẩn GeoJSON
  test('Case 8: Thứ tự tọa độ trong GeoJSON bắt buộc phải là [Longitude, Latitude]', async () => {
    await request({ lat: '21.0285', lng: '105.8542' });
    const geo = pipeline[0].$geoNear;
    assert.equal(geo.near.type, 'Point');
    // Phần tử đầu tiên là Kinh độ (105.8542), phần tử thứ hai là Vĩ độ (21.0285)
    assert.equal(geo.near.coordinates[0], 105.8542, 'Tọa độ index 0 phải là Longitude');
    assert.equal(geo.near.coordinates[1], 21.0285, 'Tọa độ index 1 phải là Latitude');
  });

  // Case 9: Kiểm tra khoảng cách tìm kiếm (mặc định 10km, không vượt quá 10km)
  test('Case 9: Bán kính tìm kiếm bị giới hạn an toàn tối đa 10km (10000 mét)', async () => {
    // Mặc định
    await request();
    assert.equal(pipeline[0].$geoNear.maxDistance, 10000);

    // Bán kính nhỏ hơn (5km) được chấp nhận
    await request({ radius: '5000' });
    assert.equal(pipeline[0].$geoNear.maxDistance, 5000);

    // Bán kính lớn hơn (100km) tự động bị giới hạn về 10km
    await request({ radius: '100000' });
    assert.equal(pipeline[0].$geoNear.maxDistance, 10000);
  });

  // Case 10: Kiểm tra API khi database xảy ra lỗi
  test('Case 10: Khi Database gặp sự cố, controller bắt lỗi và chuyển sang next(error)', async () => {
    dbError = new Error('Database cluster is unreachable');
    const res = await request();
    assert.equal(res.error, dbError, 'Lỗi phải được chuyển vào next(error)');
    assert.equal(res.body, undefined);
  });
});

// Giữ lại các bài test edge cases đầu vào
for (const query of [
  { lat: '' },
  { lng: ' ' },
  { lat: '91' },
  { lng: '-181' },
  { lat: ['21'] },
  { radius: 'Infinity' },
  { radius: '0' },
  { radius: '-5' },
  { page: '1.2' },
  { limit: 'Infinity' },
  { limit: '100.5' },
  { limit: '0' },
  { page: '9007199254740991' },
]) {
  test(`rejects invalid nearby input ${JSON.stringify(query)}`, async () => {
    assert.equal((await request(query)).status, 400);
    assert.equal(pipeline, null);
  });
}

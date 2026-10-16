import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import mongoose from 'mongoose';
import { getNearbyDevices } from '../src/controllers/deviceController.js';
let originalDb, pipeline;
beforeEach(() => {
  originalDb = mongoose.connection.db; pipeline = null;
  mongoose.connection.db = { collection: () => ({ aggregate(stages) {
    pipeline = stages;
    return { toArray: async () => [{ data: [], totals: [] }] };
  } }) };
});
afterEach(() => { mongoose.connection.db = originalDb; });
async function request(query = {}) {
  const result = {};
  const res = { status(value) { result.status = value; return this; }, json(body) { result.body = body; return this; } };
  await getNearbyDevices({ query: { lat: '21.0285', lng: '105.8542', ...query } }, res, error => { throw error; });
  return result;
}
test('nearby uses 10km and only available, undeleted valid GeoJSON devices', async () => {
  assert.equal((await request()).status, 200);
  const geo = pipeline[0].$geoNear;
  assert.deepEqual(geo.near.coordinates, [105.8542, 21.0285]);
  assert.equal(geo.maxDistance, 10000);
  assert.equal(geo.query.status, 'available');
  assert.deepEqual(geo.query.isDeleted, { $ne: true });
  assert.equal(geo.query['location.type'], 'Point');
  assert.deepEqual(geo.query['location.coordinates'], { $size: 2 });
  assert.deepEqual(pipeline[1].$sort, { distanceMeters: 1, _id: 1 });
});
test('radius cannot expand beyond 10km', async () => {
  await request({ radius: '100000' }); assert.equal(pipeline[0].$geoNear.maxDistance, 10000);
});
test('smaller radius and pagination remain supported', async () => {
  await request({ radius: '5000', page: '2', limit: '100' });
  assert.equal(pipeline[0].$geoNear.maxDistance, 5000);
  assert.deepEqual(pipeline.at(-1).$facet.data, [{ $skip: 100 }, { $limit: 100 }]);
});
for (const query of [{ lat: '' }, { lng: ' ' }, { lat: '91' }, { lng: '-181' }, { lat: ['21'] }, { radius: 'Infinity' }, { radius: '0' }, { radius: '-5' }, { page: '1.2' }, { limit: 'Infinity' }, { limit: '100.5' }, { limit: '0' }, { page: '9007199254740991' }]) {
  test(`rejects invalid nearby input ${JSON.stringify(query)}`, async () => {
    assert.equal((await request(query)).status, 400); assert.equal(pipeline, null);
  });
}

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import mongoose from 'mongoose';
import { getRecommendedDevices } from '../src/controllers/deviceController.js';

let previousDb, pipeline, aggregateResult, databaseError;
beforeEach(() => {
  previousDb = mongoose.connection.db;
  pipeline = null;
  databaseError = null;
  aggregateResult = [{ data: [{ _id: 'device-1', distanceMeters: 100 }], totals: [{ total: 31 }] }];
  mongoose.connection.db = {
    collection(name) {
      assert.equal(name, 'devices');
      return { aggregate(stages) {
        pipeline = stages;
        return { async toArray() { if (databaseError) throw databaseError; return aggregateResult; } };
      } };
    },
  };
});
afterEach(() => { mongoose.connection.db = previousDb; });

async function request(query = {}) {
  const result = {};
  const response = {
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  await getRecommendedDevices({ query: { lat: '21.0285', lng: '105.8542', ...query } }, response, error => { result.error = error; });
  return result;
}

test('recommended query uses geoNear, 100 km, eligible GeoJSON and stable nearest-first ranking', async () => {
  const result = await request();
  assert.equal(result.status, 200);
  const geo = pipeline[0].$geoNear;
  assert.deepEqual(geo.near, { type: 'Point', coordinates: [105.8542, 21.0285] });
  assert.equal(geo.key, 'location'); assert.equal(geo.spherical, true);
  assert.equal(geo.maxDistance, 100000);
  assert.equal(geo.query.status, 'available');
  assert.deepEqual(geo.query.isDeleted, { $ne: true });
  assert.equal(geo.query['location.type'], 'Point');
  assert.deepEqual(geo.query['location.coordinates'], { $size: 2 });
  assert.deepEqual(geo.query['location.coordinates.0'], { $type: 'number', $gte: -180, $lte: 180 });
  assert.deepEqual(geo.query['location.coordinates.1'], { $type: 'number', $gte: -90, $lte: 90 });
  assert.deepEqual(pipeline.find(stage => stage.$sort).$sort, { distanceMeters: 1, _recommendationRating: -1, createdAt: -1, _id: 1 });
  assert.deepEqual(pipeline.at(-1).$facet.data, [{ $skip: 0 }, { $limit: 12 }]);
  assert.deepEqual(result.body.pagination, { page: 1, limit: 12, total: 31, totalPages: 3, hasNextPage: true });
  assert.equal(result.body.data, aggregateResult[0].data);
});

test('page 2 skips 12 on the same ranking and caps requested limit at 12', async () => {
  const result = await request({ page: '2', limit: '100' });
  assert.equal(result.status, 200);
  assert.deepEqual(pipeline.at(-1).$facet.data, [{ $skip: 12 }, { $limit: 12 }]);
  assert.equal(result.body.pagination.limit, 12);
});

for (const query of [{ lat: '' }, { lat: '91' }, { lng: '-181' }, { lat: 'NaN' }, { lng: 'Infinity' },
  { lat: ['21'] }, { page: '0' }, { page: '1.5' }, { limit: '0' }, { limit: '1.5' }, { page: '9007199254740991' }]) {
  test(`invalid input rejected before querying MongoDB: ${JSON.stringify(query)}`, async () => {
    const result = await request(query);
    assert.equal(result.status, 400); assert.equal(pipeline, null);
  });
}

test('empty results retain valid pagination metadata', async () => {
  aggregateResult = [{ data: [], totals: [] }];
  const result = await request();
  assert.equal(result.body.count, 0);
  assert.deepEqual(result.body.pagination, { page: 1, limit: 12, total: 0, totalPages: 1, hasNextPage: false });
});

test('database failure goes to Express error handling without fake results', async () => {
  databaseError = new Error('Database unavailable');
  const result = await request();
  assert.equal(result.error, databaseError); assert.equal(result.body, undefined);
});
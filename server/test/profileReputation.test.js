import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Review from '../src/models/Review.js';
import Account from '../src/models/Account.js';
import { syncUserRatingAndTrustScore } from '../src/services/reviewService.js';
import { getProfile, getCurrentUser } from '../src/controllers/authController.js';

describe('FEATURE: Profile Trust Score and Rating Synchronization from Reviews/Ratings', () => {
  const mockUserId = new mongoose.Types.ObjectId('650000000000000000000001');
  const mockAccountId = new mongoose.Types.ObjectId('650000000000000000000002');

  let mockUserDoc;
  let mockUpdatedSet;

  beforeEach(() => {
    mockUpdatedSet = null;
    mockUserDoc = {
      _id: mockUserId,
      accountId: mockAccountId,
      name: 'Nguyen Van Test',
      username: 'testuser',
      email: 'testuser@example.com',
      rating: 5.0,
      totalReviews: 0,
      trust: { isVerified: false, score: 100, badges: [] },
      trustScore: 100,
    };

    User.findById = (id) => ({
      select: () => ({
        lean: async () => (String(id) === String(mockUserId) ? { ...mockUserDoc } : null),
      }),
    });

    User.findByIdAndUpdate = async (id, update) => {
      mockUpdatedSet = update.$set;
      Object.assign(mockUserDoc, update.$set);
      return mockUserDoc;
    };

    Account.findById = (id) => ({
      select: () => ({
        populate: () => ({
          lean: async () => ({
            _id: mockAccountId,
            userId: mockUserId,
            username: 'testuser',
            email: 'testuser@example.com',
            roleId: { code: 'renter' },
          }),
        }),
      }),
    });

    Account.findOne = () => ({
      select: () => ({
        populate: () => ({
          lean: async () => null,
        }),
      }),
    });
  });

  test('TC-PROF-01: syncUserRatingAndTrustScore computes average stars and trust score from reviews collection', async () => {
    // Mock Review.find returning 4 reviews with ratings 5, 4, 5, 4 => avg 4.5 => trust score 90
    Review.find = () => ({
      lean: async () => [
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 5 },
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 4 },
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 5 },
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 4 },
      ],
    });

    const result = await syncUserRatingAndTrustScore(mockUserId);

    assert.ok(result);
    assert.strictEqual(result.totalReviews, 4, 'totalReviews should equal count of valid reviews');
    assert.strictEqual(result.rating, 4.5, 'average rating should be (5+4+5+4)/4 = 4.5');
    assert.strictEqual(result.trustScore, 90, 'trustScore should be 4.5 * 20 = 90');

    assert.ok(mockUpdatedSet, 'User document must be updated in MongoDB');
    assert.strictEqual(mockUpdatedSet.rating, 4.5);
    assert.strictEqual(mockUpdatedSet.totalReviews, 4);
    assert.strictEqual(mockUpdatedSet['trust.score'], 90);
    assert.strictEqual(mockUpdatedSet.trustScore, 90);
  });

  test('TC-PROF-02: syncUserRatingAndTrustScore includes ratings from rating collection if present', async () => {
    Review.find = () => ({
      lean: async () => [
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 4 },
      ],
    });

    // Mock db.collection('rating') returning an additional review of 5 stars
    mongoose.connection.db = {
      collection: (name) => {
        if (name === 'rating') {
          return {
            find: () => ({
              toArray: async () => [
                { _id: new mongoose.Types.ObjectId(), userId: mockUserId, rating: 5 },
              ],
            }),
          };
        }
        return {
          find: () => ({
            toArray: async () => [],
          }),
        };
      },
    };

    const result = await syncUserRatingAndTrustScore(mockUserId);

    assert.ok(result);
    assert.strictEqual(result.totalReviews, 2, 'Total reviews should include both collection reviews and rating');
    assert.strictEqual(result.rating, 4.5, 'Average rating of [4, 5] should be 4.5');
    assert.strictEqual(result.trustScore, 90);
  });

  test('TC-PROF-03: syncUserRatingAndTrustScore preserves default 100 trustScore / 5.0 rating when 0 reviews exist', async () => {
    Review.find = () => ({
      lean: async () => [],
    });

    mongoose.connection.db = {
      collection: () => ({
        find: () => ({
          toArray: async () => [],
        }),
      }),
    };

    const result = await syncUserRatingAndTrustScore(mockUserId);

    assert.ok(result);
    assert.strictEqual(result.totalReviews, 0);
    assert.strictEqual(result.rating, 5.0);
    assert.strictEqual(result.trustScore, 100);
  });

  test('TC-PROF-04: getProfile automatically refreshes and returns calculated trustScore and rating', async () => {
    // 3 reviews of 5 stars => 5.0 rating, 100 trustScore, 3 reviews
    Review.find = () => ({
      lean: async () => [
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 5 },
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 5 },
        { _id: new mongoose.Types.ObjectId(), renterId: mockUserId, targetType: 'renter', rating: 5 },
      ],
    });

    const req = {
      params: { userId: String(mockUserId) },
      user: { userId: String(mockUserId) },
    };

    let responseCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
            return data;
          },
        };
      },
    };

    await getProfile(req, res);

    assert.strictEqual(responseCode, 200);
    assert.strictEqual(responseBody?.success, true);
    assert.strictEqual(responseBody?.user?.rating, 5.0);
    assert.strictEqual(responseBody?.user?.totalReviews, 3);
    assert.strictEqual(responseBody?.user?.trustScore, 100);
    assert.strictEqual(responseBody?.user?.trust?.score, 100);
  });
});


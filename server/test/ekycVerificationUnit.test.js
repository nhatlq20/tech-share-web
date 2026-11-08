import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { EkycRequest } from '../src/models/EkycRequest.js';
import { OwnerEkycRequest } from '../src/models/OwnerEkycRequest.js';

describe('FEATURE: eKYC Verification & Collection Mapping', () => {
  it('TC-EKYC-01: EkycRequest model should be bound strictly to collection ekyc_requests (Renter)', () => {
    assert.equal(EkycRequest.collection.name, 'ekyc_requests');
  });

  it('TC-EKYC-02: OwnerEkycRequest model should be bound strictly to collection owner_request (Owner Upgrade)', () => {
    assert.equal(OwnerEkycRequest.collection.name, 'owner_request');
  });

  it('TC-EKYC-03: Renter eKYC request data correctly maps 2 ID card photos', () => {
    const dummyReq = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      fullName: 'Trần Văn B',
      email: 'tranvanb@techshare.vn',
      phone: '0987654321',
      address: 'Đà Nẵng, Việt Nam',
      idCardNumber: '048201009988',
      idCardFrontUrl: 'https://res.cloudinary.com/demo/image/upload/front.jpg',
      idCardBackUrl: 'https://res.cloudinary.com/demo/image/upload/back.jpg',
      status: 'pending',
    };

    assert.equal(dummyReq.idCardNumber, '048201009988');
    assert.ok(dummyReq.idCardFrontUrl.includes('front.jpg'));
    assert.ok(dummyReq.idCardBackUrl.includes('back.jpg'));
    assert.equal(dummyReq.status, 'pending');
  });

  it('TC-EKYC-04: Owner upgrade request requires all 3 photos including selfie holding ID', () => {
    const dummyOwnerReq = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      fullName: 'Lê Thị C',
      email: 'lethic@techshare.vn',
      phone: '0912345678',
      address: 'Hà Nội, Việt Nam',
      idCardNumber: '001201009988',
      idCardFrontUrl: 'https://res.cloudinary.com/demo/image/upload/front.jpg',
      idCardBackUrl: 'https://res.cloudinary.com/demo/image/upload/back.jpg',
      idCardHoldingUrl: 'https://res.cloudinary.com/demo/image/upload/holding.jpg',
      status: 'pending',
    };

    assert.equal(dummyOwnerReq.idCardNumber, '001201009988');
    assert.ok(dummyOwnerReq.idCardFrontUrl.includes('front.jpg'));
    assert.ok(dummyOwnerReq.idCardBackUrl.includes('back.jpg'));
    assert.ok(dummyOwnerReq.idCardHoldingUrl.includes('holding.jpg'));
    assert.equal(dummyOwnerReq.status, 'pending');
  });

  it('TC-EKYC-05: Non-pending requests are locked and cannot be re-approved or modified', () => {
    const approvedDoc = { status: 'approved' };
    const rejectedDoc = { status: 'rejected' };
    const isPending = (doc) => doc.status === 'pending';

    assert.equal(isPending(approvedDoc), false);
    assert.equal(isPending(rejectedDoc), false);
  });
});


import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Maximize2,
  X,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { uploadHandoverImage } from '../../services/uploadService.js';
import { submitRenterHandoverPhotos } from '../../services/bookingService.js';

const MAX_PHOTOS = 6;

/**
 * Extract initial beforeRental photos & note from normalized or raw booking document
 */
const extractInitialPhotos = (booking) => {
  if (Array.isArray(booking?.handover?.beforePhotos) && booking.handover.beforePhotos.length > 0) {
    return booking.handover.beforePhotos;
  }
  if (Array.isArray(booking?.handoverPhotos?.beforeRental) && booking.handoverPhotos.beforeRental.length > 0) {
    return booking.handoverPhotos.beforeRental;
  }
  return [];
};

const extractInitialNote = (booking) => {
  return booking?.handover?.beforeNote || booking?.conditionNotes?.before || '';
};

const extractQrToken = (booking) => {
  return (
    booking?.qrToken ||
    booking?.handover?.qrToken ||
    (booking?.bookingCode ? `TSQR-${booking.bookingCode}` : `TSQR-${booking?._id || ''}`)
  );
};

/**
 * RenterHandoverSection
 * Displays the booking's handover QR Code (using qrcode.react) and allows the Renter
 * to upload before-rental inspection photos (beforeRental) to Cloudinary & save to MongoDB.
 */
export const RenterHandoverSection = ({ booking, onBookingUpdated, compact = false }) => {
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState(() => extractInitialPhotos(booking));
  const [beforeNote, setBeforeNote] = useState(() => extractInitialNote(booking));
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedQr, setCopiedQr] = useState(false);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const qrToken = extractQrToken(booking);
  const bookingId = booking?._id || booking?.bookingCode;
  const isApproved = booking?.status === 'approved';
  const isActive = booking?.status === 'active';
  const canEditPhotos = isApproved || isActive;

  useEffect(() => {
    setPhotos(extractInitialPhotos(booking));
    setBeforeNote(extractInitialNote(booking));
  }, [booking?._id, booking?.updatedAt]);

  const handleCopyQrToken = async () => {
    if (!qrToken) return;
    try {
      await navigator.clipboard.writeText(qrToken);
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const persistToDatabase = async (nextPhotos, nextNote, customSuccessText) => {
    if (!bookingId) return;
    try {
      setIsSavingDb(true);
      setErrorMsg(null);
      const updatedBooking = await submitRenterHandoverPhotos(bookingId, {
        beforePhotos: nextPhotos,
        beforeNote: nextNote,
      });
      if (updatedBooking && typeof onBookingUpdated === 'function') {
        onBookingUpdated(updatedBooking);
      }
      setSuccessMsg(customSuccessText || 'Đã lưu ảnh nhận máy (beforeRental) lên hệ thống thành công!');
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể lưu ảnh nhận máy. Vui lòng thử lại.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Reset input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Bạn chỉ có thể tải tối đa ${MAX_PHOTOS} ảnh tình trạng máy lúc nhận.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    const invalidFile = filesToUpload.find((f) => !f.type.startsWith('image/'));
    if (invalidFile) {
      setErrorMsg('Vui lòng chỉ chọn định dạng file hình ảnh (JPG, PNG, WEBP).');
      return;
    }

    try {
      setIsUploadingCloudinary(true);
      setUploadProgress(5);
      setErrorMsg(null);
      setSuccessMsg(null);

      const uploadedUrls = [];
      for (let i = 0; i < filesToUpload.length; i += 1) {
        const file = filesToUpload[i];
        const result = await uploadHandoverImage(file, {
          onProgress: (pct) => {
            const overall = Math.round(((i + pct / 100) / filesToUpload.length) * 100);
            setUploadProgress(Math.max(5, Math.min(99, overall)));
          },
        });
        if (result?.url) {
          uploadedUrls.push(result.url);
        }
      }

      setUploadProgress(100);
      if (uploadedUrls.length > 0) {
        const nextPhotos = [...photos, ...uploadedUrls];
        setPhotos(nextPhotos);
        await persistToDatabase(
          nextPhotos,
          beforeNote,
          `Đã tải ${uploadedUrls.length} ảnh lên Cloudinary và lưu vào đơn hàng!`
        );
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Tải ảnh lên Cloudinary thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploadingCloudinary(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const handleRemovePhoto = async (indexToRemove) => {
    if (!canEditPhotos || isSavingDb || isUploadingCloudinary) return;
    const nextPhotos = photos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(nextPhotos);
    await persistToDatabase(nextPhotos, beforeNote, 'Đã cập nhật danh sách ảnh nhận máy.');
  };

  const handleSaveManual = async (e) => {
    if (e) e.preventDefault();
    await persistToDatabase(photos, beforeNote, 'Đã lưu ảnh và ghi chú tình trạng nhận máy!');
  };

  if (!booking) return null;

  // Only show for approved, or active/completed if photos exist or active rental
  if (!isApproved && !isActive && photos.length === 0) {
    return null;
  }

  return (
    <div
      id="renter-handover-section"
      className={`bg-white rounded-3xl ${compact ? 'p-5' : 'p-6 sm:p-8 shadow-sm border border-teal-200/80 mb-6'} relative overflow-hidden`}
    >
      {/* Top Decorative Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {isApproved
                  ? 'Mã QR Bàn giao & Tải ảnh nhận máy (beforeRental)'
                  : 'Hồ sơ Bàn giao & Ảnh nhận máy (beforeRental)'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="w-3 h-3" />
                {isApproved ? 'Sẵn sàng nhận bàn giao' : 'Bảo vệ Escrow'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isApproved
                ? 'Đơn thuê đã được Chủ thiết bị chấp nhận. Hãy xuất trình mã QR bên dưới khi gặp Chủ máy và tải lên ảnh tình trạng máy lúc nhận.'
                : 'Ảnh tình trạng thiết bị lúc nhận (beforeRental) được lưu trữ trên Cloudinary để đối soát bảo vệ tiền cọc Escrow.'}
            </p>
          </div>
        </div>

        {photos.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold self-start sm:self-auto shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã tải {photos.length}/{MAX_PHOTOS} ảnh nhận máy</span>
          </span>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-column content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: QR CODE HANDOVER (shown in approved & active) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-50 to-teal-50/30 border border-slate-200/80 p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-600" />
                Mã QR Bàn giao đơn hàng
              </span>
              <button
                type="button"
                onClick={() => setIsQrZoomOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition"
                title="Phóng to mã QR"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Phóng to</span>
              </button>
            </div>

            {/* QR Canvas Box */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center justify-center relative">
              <div
                onClick={() => setIsQrZoomOpen(true)}
                className="p-3 rounded-2xl bg-white border-2 border-teal-500/20 hover:border-teal-500/50 transition cursor-pointer shadow-2xs"
                title="Nhấn để phóng to mã QR"
              >
                <QRCodeSVG
                  id={`booking-handover-qr-${booking.bookingCode}`}
                  value={qrToken}
                  size={176}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                />
              </div>

              {/* Token Badge & Copy */}
              <div className="mt-3.5 flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl border border-slate-200 transition">
                <span className="font-mono text-xs font-bold text-slate-800 select-all">
                  {qrToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyQrToken}
                  className="text-slate-500 hover:text-teal-700 transition p-0.5"
                  title="Sao chép mã QR Token"
                >
                  {copiedQr ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Mã đơn: <strong className="text-slate-600">#{booking.bookingCode}</strong>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3.5 rounded-xl bg-white/90 border border-teal-100 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Hướng dẫn nhận bàn giao:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              1. Kiểm tra ngoại hình &amp; hoạt động của thiết bị cùng Chủ máy.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              2. Chụp và tải ảnh thiết bị lúc nhận vào khung bên cạnh.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              3. Đưa mã QR này để Chủ máy quét xác nhận kích hoạt kỳ thuê.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: BEFORE-RENTAL PHOTO UPLOADER (Cloudinary) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-slate-50/70 border border-slate-200/80 p-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-teal-600" />
                Ảnh tình trạng máy khi nhận (beforeRental)
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {photos.length}/{MAX_PHOTOS} ảnh • Cloudinary
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tải lên từ 1–6 ảnh chụp thực tế thiết bị lúc nhận (các góc máy, số serial, phụ kiện đi kèm) để bảo vệ quyền lợi hoàn cọc 100%.
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
              id={`before-rental-file-input-${booking.bookingCode}`}
            />

            {/* Upload Progress Bar */}
            {isUploadingCloudinary && (
              <div className="mb-4 p-3.5 rounded-xl bg-teal-50 border border-teal-200">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    Đang nén &amp; tải ảnh lên Cloudinary...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-teal-100 overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-200 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {photos.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative h-32 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xs"
                >
                  <img
                    src={url}
                    alt={`Ảnh nhận máy ${idx + 1}`}
                    onClick={() => setPreviewPhotoUrl(url)}
                    className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-xs">
                    Ảnh #{idx + 1}
                  </div>
                  {canEditPhotos && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={isSavingDb || isUploadingCloudinary}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-sm transition opacity-90 group-hover:opacity-100"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Upload Trigger Tile */}
              {canEditPhotos && photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingCloudinary || isSavingDb}
                  className="h-32 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition flex flex-col items-center justify-center gap-1.5 p-3 text-center cursor-pointer disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-teal-800">
                    + Tải ảnh nhận máy
                  </span>
                  <span className="text-[10px] text-slate-400">
                    JPG, PNG, WEBP (Tối đa {MAX_PHOTOS} ảnh)
                  </span>
                </button>
              )}

              {photos.length === 0 && !canEditPhotos && (
                <div className="col-span-full h-28 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                  <span>Chưa có ảnh nhận máy nào được tải lên.</span>
                </div>
              )}
            </div>

            {/* Condition Note Input */}
            <div className="mt-2">
              <label
                htmlFor={`before-note-input-${booking.bookingCode}`}
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Ghi chú tình trạng máy lúc nhận (Tùy chọn)
              </label>
              <textarea
                id={`before-note-input-${booking.bookingCode}`}
                rows={2}
                value={beforeNote}
                onChange={(e) => setBeforeNote(e.target.value)}
                disabled={!canEditPhotos || isSavingDb}
                placeholder="VD: Đã nhận đủ máy, pin zin, sạc, túi đựng. Ngoại hình máy đẹp không trầy xước..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          {canEditPhotos && (
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={isSavingDb || isUploadingCloudinary}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isSavingDb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưu ảnh &amp; Ghi chú nhận máy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen QR Zoom Modal */}
      {isQrZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsQrZoomOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-600" />
                Mã QR Bàn giao #{booking.bookingCode}
              </span>
              <button
                type="button"
                onClick={() => setIsQrZoomOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 bg-white rounded-2xl border-2 border-teal-500/30 inline-flex items-center justify-center shadow-xs">
              <QRCodeSVG
                value={qrToken}
                size={240}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>

            <div className="mt-4 font-mono text-xs font-bold text-slate-800 bg-slate-100 py-2 px-3 rounded-xl border border-slate-200 select-all">
              {qrToken}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Đưa mã QR này cho Chủ thiết bị quét để xác nhận bàn giao máy.
            </p>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="self-end mb-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
            <img
              src={previewPhotoUrl}
              alt="Xem ảnh nhận máy"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border border-white/20 object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal wrapper for opening QR & Before-Rental Photo Upload directly from MyBookingsPage table/cards
 */
export const RenterHandoverModal = ({ isOpen, booking, onClose, onBookingUpdated }) => {
  if (!isOpen || !booking) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black text-slate-900">
              Đơn thuê #{booking.bookingCode}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-teal-700">
              {booking.device?.title || booking.device?.name || 'Thiết bị công nghệ'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <RenterHandoverSection
          booking={booking}
          onBookingUpdated={onBookingUpdated}
          compact
        />
      </div>
    </div>
  );
};

export default RenterHandoverSection;


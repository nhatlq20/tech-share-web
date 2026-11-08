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
      setSuccessMsg(customSuccessText || 'Before-rental photos saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to save before-rental photos. Please try again.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`You can upload up to ${MAX_PHOTOS} before-rental photos.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    const invalidFile = filesToUpload.find((f) => !f.type.startsWith('image/'));
    if (invalidFile) {
      setErrorMsg('Please select valid image files (JPG, PNG, WEBP).');
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
          `Uploaded ${uploadedUrls.length} photo(s) to Cloudinary and saved to booking!`
        );
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Cloudinary upload failed. Please try again.');
    } finally {
      setIsUploadingCloudinary(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const handleRemovePhoto = async (indexToRemove) => {
    if (!canEditPhotos || isSavingDb || isUploadingCloudinary) return;
    const nextPhotos = photos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(nextPhotos);
    await persistToDatabase(nextPhotos, beforeNote, 'Updated before-rental photo list.');
  };

  const handleSaveManual = async (e) => {
    if (e) e.preventDefault();
    await persistToDatabase(photos, beforeNote, 'Saved before-rental photos and condition notes!');
  };

  if (!booking) return null;

  if (!isApproved && !isActive && photos.length === 0) {
    return null;
  }

  return (
    <div
      id="renter-handover-section"
      className={`bg-white rounded-2xl ${compact ? 'p-4' : 'p-4 sm:p-5 shadow-sm border border-teal-200/80 mb-3.5'} relative overflow-hidden`}
    >
      {/* Top Decorative Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-2xs flex-shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                {isApproved
                  ? 'Handover QR Code & Before-Rental Photos'
                  : 'Handover Record & Before-Rental Photos'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="w-2.5 h-2.5" />
                {isApproved ? 'Ready for Handover' : 'Escrow Protected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isApproved
                ? 'Present the QR code at pickup and upload device condition photos.'
                : 'Before-rental inspection photos stored on Cloudinary to protect your deposit.'}
            </p>
          </div>
        </div>

        {photos.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold self-start sm:self-auto shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{photos.length}/{MAX_PHOTOS} photos</span>
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
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: QR CODE HANDOVER */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-gradient-to-b from-slate-50 to-teal-50/30 border border-slate-200/80 p-3.5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                Handover QR
              </span>
              <button
                type="button"
                onClick={() => setIsQrZoomOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs transition"
                title="Enlarge QR Code"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>Enlarge</span>
              </button>
            </div>

            {/* QR Canvas Box */}
            <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center relative">
              <div
                onClick={() => setIsQrZoomOpen(true)}
                className="p-2 rounded-xl bg-white border border-teal-500/20 hover:border-teal-500/50 transition cursor-pointer"
                title="Click to enlarge QR Code"
              >
                <QRCodeSVG
                  id={`booking-handover-qr-${booking.bookingCode}`}
                  value={qrToken}
                  size={128}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                />
              </div>

              {/* Token Badge & Copy */}
              <div className="mt-2 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-lg border border-slate-200 transition">
                <span className="font-mono text-[11px] font-bold text-slate-800 select-all">
                  {qrToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyQrToken}
                  className="text-slate-500 hover:text-teal-700 transition p-0.5"
                  title="Copy QR Token"
                >
                  {copiedQr ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-slate-500 text-center">
            Show this QR code to the owner at pickup to activate rental.
          </p>
        </div>

        {/* RIGHT COLUMN: BEFORE-RENTAL PHOTO UPLOADER (Cloudinary) */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-xl bg-slate-50/70 border border-slate-200/80 p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                Before-Rental Photos (beforeRental)
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {photos.length}/{MAX_PHOTOS} • Cloudinary
              </span>
            </div>

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
                    Compressing &amp; uploading to Cloudinary...
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
              {photos.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative h-24 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xs"
                >
                  <img
                    src={url}
                    alt={`Before rental ${idx + 1}`}
                    onClick={() => setPreviewPhotoUrl(url)}
                    className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[9px] font-semibold">
                    #{idx + 1}
                  </div>
                  {canEditPhotos && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={isSavingDb || isUploadingCloudinary}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xs transition opacity-90 group-hover:opacity-100"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3 h-3" />
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
                  className="h-24 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition flex flex-col items-center justify-center gap-1 p-2 text-center cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-teal-600" />
                  <span className="text-[11px] font-bold text-teal-800">
                    + Upload
                  </span>
                </button>
              )}

              {photos.length === 0 && !canEditPhotos && (
                <div className="col-span-full h-20 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                  <span>No before-rental photos uploaded yet.</span>
                </div>
              )}
            </div>

            {/* Condition Note Input + Save Action in one row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id={`before-note-input-${booking.bookingCode}`}
                type="text"
                value={beforeNote}
                onChange={(e) => setBeforeNote(e.target.value)}
                disabled={!canEditPhotos || isSavingDb}
                placeholder="Device condition note at pickup (optional)..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
              />
              {canEditPhotos && (
                <button
                  type="button"
                  onClick={handleSaveManual}
                  disabled={isSavingDb || isUploadingCloudinary}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs transition disabled:opacity-50 shrink-0"
                >
                  {isSavingDb ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
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
                Handover QR #{booking.bookingCode}
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
              Show this QR code to the device owner to confirm handover.
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
              <span>Close</span>
            </button>
            <img
              src={previewPhotoUrl}
              alt="Before rental preview"
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
              Booking #{booking.bookingCode}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-teal-700">
              {booking.device?.title || booking.device?.name || 'Tech Device'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            aria-label="Close"
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


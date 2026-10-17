import React, { useEffect } from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";

export function DeleteDeviceModal({
  deviceName,
  isDeleting = false,
  onCancel,
  onConfirm,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <section
        className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-device-title"
        aria-describedby="delete-device-description"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-13 h-13 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-500 flex items-center justify-center mb-5 shadow-xs">
          <AlertTriangle size={24} />
        </div>

        {/* Heading & Details */}
        <h2 id="delete-device-title" className="text-lg font-bold text-slate-900">
          Delete this device?
        </h2>

        <p id="delete-device-description" className="text-xs sm:text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
          Are you sure you want to permanently delete{" "}
          <span className="font-bold text-slate-900 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
            {deviceName}
          </span>
          ? This action cannot be undone and will remove all associated rental history.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition shadow-sm hover:shadow-md flex items-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete device</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteDeviceModal;

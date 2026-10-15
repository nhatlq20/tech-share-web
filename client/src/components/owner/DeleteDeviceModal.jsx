import React from "react";

function DeleteDeviceModal({
  deviceName,
  isDeleting = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="delete-device-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <section
        className="delete-device-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-device-title"
        aria-describedby="delete-device-description"
      >
        <div className="delete-device-modal-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8v5m0 3h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <h2 id="delete-device-title">Delete this device?</h2>
        <p id="delete-device-description">
          Are you sure you want to delete <strong>{deviceName}</strong>? This
          action cannot be undone.
        </p>

        <div className="delete-device-modal-actions">
          <button
            className="delete-device-cancel-button"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-device-confirm-button"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete device"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteDeviceModal;

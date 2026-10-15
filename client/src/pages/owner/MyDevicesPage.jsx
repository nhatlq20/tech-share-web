import React, { useEffect, useState } from "react";
import "./MyDevicesPage.css";
import { deleteMyDevice, getMyDevices } from "../../services/deviceService";
import { MdBuild } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import ROUTES from "../../routes/routes";
import DeleteDeviceModal from "../../components/owner/DeleteDeviceModal";
function DeviceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M2 21h20M8 17l-1 4m9-4 1 4" />
    </svg>
  );
}

function MyDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigation = useNavigate();
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await getMyDevices();
        if (!Array.isArray(response?.devices)) {
          throw new Error(
            response?.message || "API không trả về danh sách thiết bị hợp lệ.",
          );
        }
        setDevices(response?.devices);
      } catch (error) {
        console.error("Lỗi lấy thiết bị:", error);
        setErrorMessage(error.message || "Không thể tải danh sách thiết bị.");
      }
    };

    fetchDevices();
  }, []);
  const handleDelete = async () => {
    if (!deviceToDelete) return;
    setIsDeleting(true);
    try {
      const response = await deleteMyDevice(deviceToDelete._id);

      if (response.success) {
        setDevices((prevDevices) =>
          prevDevices.filter((device) => device._id !== deviceToDelete._id),
        );
        setDeviceToDelete(null);
      } else {
        throw new Error(response.message || "Xóa thiết bị thất bại!");
      }
    } catch (error) {
      console.log("Delete error:", error);
      alert(error.message || "Xóa thiết bị thất bại!");
    } finally {
      setIsDeleting(false);
    }
  };
  const availableDevices = devices.filter(
    (device) => device.status === "available",
  ).length;
  const maintenance = devices.filter((p) => p.status === "maintenance").length;
  const hidden = devices.filter((p) => p.status === "hidden").length;

  return (
    <main className="my-devices-page">
      <div className="my-devices-container">
        <header className="my-devices-header">
          <div>
            <p className="my-devices-eyebrow">OWNER DASHBOARD</p>
            <h1>My Devices</h1>
            <p className="my-devices-subtitle">Manage your rental devices</p>
          </div>
        </header>

        <section className="my-devices-stats" aria-label="Device statistics">
          <article className="my-devices-stat-card">
            <span className="my-devices-stat-icon my-devices-stat-icon-available">
              <span aria-hidden="true">✓</span>
            </span>
            <div>
              <p>Available Devices</p>
              <strong>{availableDevices}</strong>
            </div>
            <span className="my-devices-stat-caption">On your account</span>
          </article>
          <article className="my-devices-stat-card">
            <MdBuild size={20} color="#f59e0b" />
            <div>
              <p>Maintenance Devices</p>
              <strong>{maintenance}</strong>
            </div>
            <span className="my-devices-stat-caption">Ready to rent</span>
          </article>
          <article className="my-devices-stat-card">
            <span className="my-devices-stat-icon my-devices-stat-icon-unavailable">
              <span aria-hidden="true">−</span>
            </span>
            <div>
              <p>Unavailable Devices</p>
              <strong>{hidden}</strong>
            </div>
            <span className="my-devices-stat-caption">Currently paused</span>
          </article>
        </section>

        <section className="my-devices-list-section">
          <div className="my-devices-section-heading">
            <div>
              <h2>Your listings</h2>
              <p>Keep your device details and availability up to date.</p>
            </div>
            <span className="my-devices-list-count">
              {devices.length} {devices.length === 1 ? "device" : "devices"}
            </span>
          </div>

          {errorMessage ? (
            <p className="my-devices-error" role="alert">
              {errorMessage}
            </p>
          ) : devices.length > 0 ? (
            <div className="my-devices-grid">
              {devices.map((device) => (
                <article
                  className="my-device-card"
                  key={device._id || device.id}
                >
                  <div className="my-device-image-wrap">
                    <img
                      className="my-device-image"
                      src={
                        device.images?.[0] ||
                        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={device.name || device.title}
                    />
                    <span
                      className={`my-device-status ${
                        device.status === "available"
                          ? "is-available"
                          : "is-unavailable"
                      }`}
                    >
                      <span aria-hidden="true" />
                      {device.status === "available"
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </div>

                  <div className="my-device-content">
                    <div className="my-device-title-row">
                      <div>
                        <p className="my-device-category">{device.category}</p>
                        <h3>{device.name || device.title}</h3>
                      </div>
                      <span className="my-device-condition">
                        {(device.condition || "good").replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="my-device-info">
                      <span>
                        <span className="my-device-info-label">Brand</span>
                        {device.brand}
                      </span>
                      <span>
                        <span className="my-device-info-label">Location</span>
                        {device.address || "Location not provided"}
                      </span>
                    </div>

                    <div className="my-device-price">
                      <strong>
                        {new Intl.NumberFormat("vi-VN").format(
                          device.dailyRate ?? device.pricePerDay ?? 0,
                        )}{" "}
                        <span>VND</span>
                      </strong>
                      <span>per day</span>
                    </div>

                    <div className="my-device-actions">
                      <button
                        className="my-device-details-button"
                        type="button"
                        onClick={() => navigation(`/device/${device._id}`)}
                      >
                        View Details
                      </button>
                      <button
                        className="my-device-icon-button"
                        type="button"
                        aria-label="Edit device"
                      >
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                          <path d="m13.8 3.5 2.7 2.7M4 16l3.4-.7L16 6.7a1.9 1.9 0 0 0-2.7-2.7L4.7 12.6 4 16Z" />
                        </svg>
                      </button>
                      <button
                        className="my-device-icon-button my-device-delete-button"
                        type="button"
                        aria-label="Delete device"
                        onClick={() => setDeviceToDelete(device)}
                      >
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                          <path d="M4.5 6h11m-9.8 0 .6 10h8.4l.6-10M8 6V4h4v2m-3 3v4m2-4v4" />
                        </svg>
                      </button>
                    </div>

                    <button
                      className="my-device-availability-button"
                      type="button"
                    >
                      Manage Availability
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="my-devices-empty-state">
              <span className="my-devices-empty-icon">
                <DeviceIcon />
              </span>
              <h3>You haven't posted any devices yet.</h3>
              <p>Share your devices with the community and start earning.</p>
              <button
                className="my-devices-primary-button"
                type="button"
                onClick={() => navigation(ROUTES.OWNER_DEVICE_NEW)}
              >
                <span className="my-devices-plus" aria-hidden="true">
                  +
                </span>
                Post Your First Device
              </button>
            </div>
          )}
        </section>
      </div>
      {deviceToDelete && (
        <DeleteDeviceModal
          deviceName={deviceToDelete.name || deviceToDelete.title}
          isDeleting={isDeleting}
          onCancel={() => setDeviceToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}

export default MyDevicesPage;

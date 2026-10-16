import React from "react";
import "./StatusSwitch.css";

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
  { value: "hidden", label: "Hidden" },
];

function StatusSwitch({ status, onStatusChange, disabled = false }) {
  return (
    <div
      className="status-switch"
      role="radiogroup"
      aria-label="Device status"
    >
      {statusOptions.map((option) => (
        <button
          key={option.value}
          className={`status-switch-option ${
            status === option.value ? `is-selected is-${option.value}` : ""
          }`}
          type="button"
          role="radio"
          aria-checked={status === option.value}
          onClick={() => onStatusChange(option.value)}
          disabled={disabled || status === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default StatusSwitch;

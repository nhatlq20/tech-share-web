import React from "react";
import { formatCategoryLabel } from "./device/DeviceCard.jsx";
import { formatPrice } from "../utils/formatters.js";

const NOT_AVAILABLE = "N/A";

const getDeviceName = (device) =>
  device?.title || device?.name || NOT_AVAILABLE;

const getSpecEntries = (device) => {
  const specs = device?.specifications ?? device?.specs;
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return [];
  }
  return Object.entries(specs).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
};

const getRentalPrice = (device) => {
  const price = device?.dailyRate ?? device?.pricePerDay;
  return typeof price === "number" && Number.isFinite(price)
    ? `${formatPrice(price)} / day`
    : NOT_AVAILABLE;
};

const getAiSpecValues = (comparison, pattern) => {
  const specs = Array.isArray(comparison?.specifications)
    ? comparison.specifications
    : [];
  const matchingSpec = specs.find((spec) => pattern.test(spec?.label || ""));
  return matchingSpec
    ? [
        matchingSpec.device1 || NOT_AVAILABLE,
        matchingSpec.device2 || NOT_AVAILABLE,
      ]
    : null;
};

const getDeviceSpecValues = (device1, device2, pattern) => {
  const getValue = (device) => {
    const matchingSpec = getSpecEntries(device).find(([key]) =>
      pattern.test(key),
    );
    return matchingSpec ? String(matchingSpec[1]) : NOT_AVAILABLE;
  };
  return [getValue(device1), getValue(device2)];
};

const getSpecValues = (comparison, device1, device2, pattern) =>
  getAiSpecValues(comparison, pattern) ||
  getDeviceSpecValues(device1, device2, pattern);

const getTechnicalSpecText = (device) => {
  const excludedFields =
    /sensor|camera|lens|battery|capacity|weight|rental|price|performance/i;
  const specs = getSpecEntries(device).filter(
    ([key]) => !excludedFields.test(key),
  );
  return specs.length
    ? specs.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
    : NOT_AVAILABLE;
};

const renderList = (items) => {
  if (!Array.isArray(items) || items.length === 0) return NOT_AVAILABLE;
  return (
    <ul className="comparison-detail-list">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item || NOT_AVAILABLE}</li>
      ))}
    </ul>
  );
};

export const ComparisonTable = ({ device1, device2, comparison }) => {
  const sensorValues = getSpecValues(
    comparison,
    device1,
    device2,
    /camera|sensor/i,
  );
  const batteryValues = getSpecValues(comparison, device1, device2, /battery/i);
  const weightValues = getSpecValues(comparison, device1, device2, /weight/i);
  const priceValues = getSpecValues(
    comparison,
    device1,
    device2,
    /rental price/i,
  );
  const performanceValues = getSpecValues(
    comparison,
    device1,
    device2,
    /performance\s*\/\s*price/i,
  );
  const advantages = comparison?.advantages || {};
  const disadvantages = comparison?.disadvantages || {};
  const recommendation = comparison?.recommendation;
  const winnerName =
    recommendation?.winner === "device1"
      ? getDeviceName(device1)
      : recommendation?.winner === "device2"
        ? getDeviceName(device2)
        : recommendation?.winner === "tie"
          ? "Tie"
          : NOT_AVAILABLE;

  const rows = [
    ["Device Name", getDeviceName(device1), getDeviceName(device2)],
    ["Brand", device1?.brand || NOT_AVAILABLE, device2?.brand || NOT_AVAILABLE],
    [
      "Category",
      formatCategoryLabel(device1?.category) || NOT_AVAILABLE,
      formatCategoryLabel(device2?.category) || NOT_AVAILABLE,
    ],
    [
      "Technical Specifications",
      getTechnicalSpecText(device1),
      getTechnicalSpecText(device2),
    ],
    ["Sensors / Camera", sensorValues[0], sensorValues[1]],
    ["Battery", batteryValues[0], batteryValues[1]],
    ["Weight", weightValues[0], weightValues[1]],
    [
      "Rental Price per Day",
      priceValues[0] === NOT_AVAILABLE
        ? getRentalPrice(device1)
        : priceValues[0],
      priceValues[1] === NOT_AVAILABLE
        ? getRentalPrice(device2)
        : priceValues[1],
    ],
    ["Performance / Rental Price", performanceValues[0], performanceValues[1]],
    [
      "Advantages",
      renderList(advantages.device1),
      renderList(advantages.device2),
    ],
    [
      "Disadvantages",
      renderList(disadvantages.device1),
      renderList(disadvantages.device2),
    ],
  ];

  return (
    <section
      className="comparison-result"
      aria-labelledby="comparison-result-title"
    >
      <div className="comparison-result-heading">
        <div>
          <span className="comparison-eyebrow">AI-powered insights</span>
          <h2 id="comparison-result-title">Your comparison</h2>
        </div>
      </div>

      <div className="comparison-table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">{getDeviceName(device1)}</th>
              <th scope="col">{getDeviceName(device2)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, firstValue, secondValue]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{firstValue}</td>
                <td>{secondValue}</td>
              </tr>
            ))}
            <tr className="comparison-recommendation-row">
              <th scope="row">AI Recommendation</th>
              <td colSpan="2">
                {recommendation?.reason ? (
                  <>
                    <strong>{winnerName}</strong>: {recommendation.reason}
                  </>
                ) : (
                  NOT_AVAILABLE
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ComparisonTable;

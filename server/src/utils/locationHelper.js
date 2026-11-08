/**
 * Location Helper for TechShare
 * Single Source of Truth: users.location
 */

/**
 * Resolves device location dynamically from its owner.
 * Returns GeoJSON Point object with coordinates and addressText, or null if missing/invalid.
 * NEVER returns hardcoded fallback coordinates like [105.7826, 21.0285].
 *
 * @param {Object} device - Device document or object
 * @param {Object} [owner] - Owner User document or object (optional if populated on device)
 * @returns {{ type: 'Point', coordinates: [number, number], addressText: string } | null}
 */
export const resolveDeviceLocation = (device, owner) => {
  const resolvedOwner =
    owner ||
    (device?.ownerId && typeof device.ownerId === 'object' ? device.ownerId : null) ||
    (device?.owner && typeof device.owner === 'object' ? device.owner : null);

  const loc = resolvedOwner?.location;
  if (
    loc &&
    (loc.type === 'Point' || !loc.type) &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length === 2
  ) {
    const lng = Number(loc.coordinates[0]);
    const lat = Number(loc.coordinates[1]);
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    ) {
      return {
        type: 'Point',
        coordinates: [lng, lat],
        addressText: (resolvedOwner.address || loc.addressText || '').trim(),
      };
    }
  }
  return null;
};

/**
 * Validates GeoJSON Point coordinates.
 *
 * @param {number} lng - Longitude (-180 to 180)
 * @param {number} lat - Latitude (-90 to 90)
 * @returns {boolean}
 */
export const isValidCoordinates = (lng, lat) => {
  const numLng = Number(lng);
  const numLat = Number(lat);
  return (
    Number.isFinite(numLng) &&
    Number.isFinite(numLat) &&
    numLng >= -180 &&
    numLng <= 180 &&
    numLat >= -90 &&
    numLat <= 90
  );
};


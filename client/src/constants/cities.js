/**
 * Supported Cities for TechShare Location-Based Device Discovery
 * Search Radius: 100,000 meters (100 km)
 */
export const SUPPORTED_CITIES = [
  {
    key: 'can_tho',
    name: 'Cần Thơ',
    aliases: ['can tho', 'can_tho', 'cần thơ', 'cantho', 'tp. cần thơ', 'tp cần thơ'],
    lat: 10.0452,
    lng: 105.7469,
  },
  {
    key: 'ha_noi',
    name: 'Hà Nội',
    aliases: ['ha noi', 'ha_noi', 'hanoi', 'hà nội', 'tp. hà nội', 'tp hà nội'],
    lat: 21.0285,
    lng: 105.8542,
  },
  {
    key: 'ho_chi_minh',
    name: 'TP. Hồ Chí Minh',
    aliases: ['ho chi minh', 'ho_chi_minh', 'hcm', 'tp hcm', 'tp. hcm', 'tp. hồ chí minh', 'saigon', 'sài gòn', 'tphcm'],
    lat: 10.7769,
    lng: 106.7009,
  },
  {
    key: 'da_nang',
    name: 'Đà Nẵng',
    aliases: ['da nang', 'da_nang', 'danang', 'đà nẵng', 'tp. đà nẵng', 'tp đà nẵng'],
    lat: 16.0544,
    lng: 108.2022,
  },
  {
    key: 'hai_phong',
    name: 'Hải Phòng',
    aliases: ['hai phong', 'hai_phong', 'haiphong', 'hải phòng', 'tp. hải phòng', 'tp hải phòng'],
    lat: 20.8449,
    lng: 106.6881,
  },
];

export const getCityByKey = (key) => {
  if (!key || typeof key !== 'string') return null;
  const normalized = key.trim().toLowerCase();
  return SUPPORTED_CITIES.find((c) => c.key === normalized || c.aliases.includes(normalized)) || null;
};

export const matchCityFromAddress = (address) => {
  if (!address || typeof address !== 'string') return null;
  const text = address.toLowerCase();
  for (const city of SUPPORTED_CITIES) {
    for (const alias of city.aliases) {
      if (text.includes(alias)) {
        return city;
      }
    }
  }
  return null;
};

export const resolveCityName = (address) => {
  if (!address || typeof address !== 'string') return '';
  const matched = matchCityFromAddress(address);
  if (matched) return matched.name;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : address;
};

export const findClosestCity = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let closest = null;
  let minDistance = Infinity;

  for (const city of SUPPORTED_CITIES) {
    const dLat = (city.lat - lat) * (Math.PI / 180);
    const dLon = (city.lng - lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * (Math.PI / 180)) * Math.cos(city.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distanceMeters = 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distanceMeters < minDistance) {
      minDistance = distanceMeters;
      closest = { ...city, distanceMeters };
    }
  }
  return closest;
};


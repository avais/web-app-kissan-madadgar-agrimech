/**
 * Single source of truth for the journey / live-track tractor marker on Leaflet maps.
 * Change {@link TRACTOR_MAP_ICON_PX} to resize everywhere this icon is used.
 */
export const TRACTOR_MAP_ICON_PX = 40;

export function buildTractorMapMarkerSvg(): string {
  const w = TRACTOR_MAP_ICON_PX;
  return `
      <svg width="${w}" height="${w}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#16a34a"/>
            <stop offset="100%" stop-color="#14532d"/>
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <linearGradient id="tires" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#111827"/>
            <stop offset="50%" stop-color="#4b5563"/>
            <stop offset="100%" stop-color="#000000"/>
          </linearGradient>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <rect x="6" y="32" width="36" height="4" fill="#374151" rx="1"/>
          <rect x="10" y="8" width="28" height="3" fill="#374151" rx="1"/>
          <rect x="2" y="24" width="10" height="20" rx="3" fill="url(#tires)"/>
          <rect x="36" y="24" width="10" height="20" rx="3" fill="url(#tires)"/>
          <line x1="2" y1="28" x2="12" y2="28" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="2" y1="34" x2="12" y2="34" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="2" y1="40" x2="12" y2="40" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="28" x2="46" y2="28" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="34" x2="46" y2="34" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <line x1="36" y1="40" x2="46" y2="40" stroke="#000" stroke-width="1.5" opacity="0.7"/>
          <rect x="8" y="2" width="6" height="12" rx="2" fill="url(#tires)"/>
          <rect x="34" y="2" width="6" height="12" rx="2" fill="url(#tires)"/>
          <path d="M 16 4 L 32 4 L 32 20 L 16 20 Z" fill="url(#body)" stroke="#4ade80" stroke-width="1"/>
          <rect x="19" y="8" width="10" height="1.5" fill="#064e3b"/>
          <rect x="19" y="12" width="10" height="1.5" fill="#064e3b"/>
          <rect x="19" y="16" width="10" height="1.5" fill="#064e3b"/>
          <path d="M 12 20 L 36 20 L 36 44 L 12 44 Z" fill="url(#body)" stroke="#22c55e" stroke-width="1.5"/>
          <path d="M 15 24 L 33 24 L 33 39 L 15 39 Z" fill="url(#glass)"/>
          <path d="M 17 26 L 31 26 L 31 37 L 17 37 Z" fill="url(#body)" stroke="#86efac" stroke-width="0.5"/>
          <circle cx="18" cy="4" r="2.5" fill="#fef08a"/>
          <circle cx="30" cy="4" r="2.5" fill="#fef08a"/>
          <rect x="14" y="42" width="4" height="2" fill="#ef4444"/>
          <rect x="30" y="42" width="4" height="2" fill="#ef4444"/>
        </g>
      </svg>
      `;
}

export function tractorMapIconLeafletOptions(): {
  iconUrl: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
} {
  const n = TRACTOR_MAP_ICON_PX;
  const half = n / 2;
  return {
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildTractorMapMarkerSvg()),
    iconSize: [n, n],
    iconAnchor: [half, half],
  };
}

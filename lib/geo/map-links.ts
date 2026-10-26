export type MapLinks = {
  googleMapsUrl: string;
  openStreetMapUrl: string;
  embedUrl: string;
};

function coordinate(value: number, min: number, max: number): string | null {
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value.toFixed(6);
}

/** Links for a real coordinate. Returns null when the numbers are not a location. */
export function mapLinksForCoordinates(
  latitude: number,
  longitude: number,
  approximate: boolean,
): MapLinks | null {
  const lat = coordinate(latitude, -90, 90);
  const lng = coordinate(longitude, -180, 180);
  if (!lat || !lng) return null;
  const pad = approximate ? 0.2 : 0.02;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const west = clamp(longitude - pad, -180, 180).toFixed(5);
  const south = clamp(latitude - pad, -85, 85).toFixed(5);
  const east = clamp(longitude + pad, -180, 180).toFixed(5);
  const north = clamp(latitude + pad, -85, 85).toFixed(5);
  const zoom = approximate ? "11" : "16";
  return {
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`,
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${lat}%2C${lng}`,
  };
}

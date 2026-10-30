// Lógica pura. No guarda la ubicación del usuario ni realiza peticiones de red.
export function normalizedCoordinates(lat, lng) {
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}
export function pairFromText(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^\s*(?:loc:|geo:)/i,'');
  const match = cleaned.match(/^\s*([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/);
  return match ? normalizedCoordinates(match[1], match[2]) : null;
}
export function extractMapsCoordinates(value) {
  if (typeof value !== 'string') return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  // Los enlaces acortados redirigen; el navegador no permite resolverlos directamente por CORS.
  if (!/^https?:$/.test(url.protocol)) return null;
  const hostname = url.hostname.toLowerCase();
  if (!(hostname === 'maps.app.goo.gl' || hostname === 'goo.gl' || hostname.startsWith('maps.google.') || hostname.startsWith('www.google.') || hostname.startsWith('google.'))) return null;
  let decoded;
  try { decoded = decodeURIComponent(url.href.replace(/%(?![\da-f]{2})/gi,'%25')); }
  catch { decoded = url.href; }
  // Primero la coordenada del marcador de Google Maps, nunca el centro @ del mapa.
  const marker = decoded.match(/!3d([+-]?\d{1,2}(?:\.\d+)?)!4d([+-]?\d{1,3}(?:\.\d+)?)/);
  if (marker) return normalizedCoordinates(marker[1],marker[2]);
  for(const param of ['query','q','ll','daddr','destination']) {
    const raw = url.searchParams.get(param);
    const fromParameter = raw ? pairFromText(raw) : null;
    if (fromParameter) return fromParameter;
  }
  // /search/lat,lon es una ubicación explícita, a diferencia de /@lat,lon (centro de vista).
  const searchPoint = decoded.match(/\/maps\/search\/([+-]?\d{1,2}(?:\.\d+)?),([+-]?\d{1,3}(?:\.\d+)?)(?:[/?]|$)/);
  if (searchPoint) return normalizedCoordinates(searchPoint[1],searchPoint[2]);
  return null;
}
export function isValidCoordinates(coords) {
  return coords != null && typeof coords.lat === 'number' && typeof coords.lng === 'number' && normalizedCoordinates(coords.lat,coords.lng) !== null;
}
export function distanceKm(a,b) {
  if (!isValidCoordinates(a) || !isValidCoordinates(b)) return null;
  const toRad = x => x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const sinA = Math.sin(dLat/2),sinB=Math.sin(dLng/2);
  const h=sinA*sinA+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*sinB*sinB;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function distanceLabel(km) {
  if(km===null || !Number.isFinite(km)) return '';
  return km<1 ? `${Math.round(km*1000)} m` : `${km.toFixed(km<10?1:0).replace('.',',')} km`;
}

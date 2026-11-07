const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_DIMENSION = 8_192;
const MAX_PIXELS = 40_000_000;

function dimensionsAreSafe(width, height) {
  return Number.isInteger(width) && Number.isInteger(height)
    && width > 0 && height > 0
    && width <= MAX_DIMENSION && height <= MAX_DIMENSION
    && width * height <= MAX_PIXELS;
}

function pngDimensions(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (frameMarkers.has(marker)) {
      if (length < 7) return null;
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes) {
  if (bytes.length < 25 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunkType = bytes.toString('ascii', 12, 16);
  if (chunkType === 'VP8X' && bytes.length >= 30) {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunkType === 'VP8L' && bytes[20] === 0x2f && bytes.length >= 25) {
    return {
      width: 1 + (bytes[21] | ((bytes[22] & 0x3f) << 8)),
      height: 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10)),
    };
  }
  if (chunkType === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

/** Accept only bounded PNG/JPEG/WebP data with recognizable headers and safe dimensions. */
export function parseImageDataUrl(dataUrl, maxBytes) {
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(maxBytes * 4 / 3) + 40) return null;
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) return null;

  const dimensions = match[1] === 'image/png'
    ? pngDimensions(bytes)
    : match[1] === 'image/jpeg'
      ? jpegDimensions(bytes)
      : webpDimensions(bytes);
  if (!dimensions || !dimensionsAreSafe(dimensions.width, dimensions.height)) return null;
  return { mimeType: match[1], data: bytes.toString('base64'), width: dimensions.width, height: dimensions.height };
}

export function isValidImageDataUrl(dataUrl, maxBytes) {
  return parseImageDataUrl(dataUrl, maxBytes) !== null;
}

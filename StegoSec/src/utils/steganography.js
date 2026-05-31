/**
 * StegoSec – Steganography & Steganalysis Module
 * LSB embedding/extraction + chi-square, bit-plane, histogram analysis.
 */

// ─────────────────────────────────────────────
//  LSB EMBED / EXTRACT
// ─────────────────────────────────────────────

/** Embed a Uint8Array payload into an image via LSB. Returns PNG data-URL. */
export function embedPayload(imageEl, payload) {
  const canvas = document.createElement('canvas');
  canvas.width  = imageEl.width;
  canvas.height = imageEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageEl, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imgData.data;

  const totalBits = 32 + payload.length * 8;
  const capacity  = Math.floor((px.length / 4) * 3);
  if (totalBits > capacity) throw new Error(`Image too small – need ${totalBits} bits, have ${capacity}.`);

  function* bits() {
    const len = payload.length;
    for (let i = 31; i >= 0; i--) yield (len >> i) & 1;
    for (const byte of payload)
      for (let j = 7; j >= 0; j--) yield (byte >> j) & 1;
  }

  const iter = bits();
  outer: for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const { value, done } = iter.next();
      if (done) break outer;
      px[i + c] = (px[i + c] & ~1) | value;
    }
    px[i + 3] = 255; // ensure opaque
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Extract a Uint8Array payload previously embedded with embedPayload. */
export function extractPayload(imageEl) {
  const canvas = document.createElement('canvas');
  canvas.width  = imageEl.width;
  canvas.height = imageEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageEl, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imgData.data;

  function* lsbBits() {
    for (let i = 0; i < px.length; i += 4)
      for (let c = 0; c < 3; c++) yield px[i + c] & 1;
  }

  const iter = lsbBits();
  let length = 0;
  for (let i = 0; i < 32; i++) {
    const { value, done } = iter.next();
    if (done) throw new Error('Image has no embedded data.');
    length = (length << 1) | value;
  }
  if (length <= 0 || length * 8 > Math.floor((px.length / 4) * 3) - 32)
    throw new Error('No valid payload detected in this image.');

  const payload = new Uint8Array(length);
  for (let b = 0; b < length; b++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const { value, done } = iter.next();
      if (done) throw new Error('Payload truncated.');
      byte = (byte << 1) | value;
    }
    payload[b] = byte;
  }
  return payload;
}

// ─────────────────────────────────────────────
//  COVERT WATERMARK
// ─────────────────────────────────────────────

/**
 * Injects an invisible forensic watermark (userId + timestamp) into an image.
 * Returns a PNG data-URL.
 */
export function injectWatermark(imageEl, userId) {
  const stamp = `STEGWM|${userId}|${new Date().toISOString()}`;
  const payload = new TextEncoder().encode(stamp);
  return embedPayload(imageEl, payload);
}

/** Tries to read a watermark from an image. Returns null if none found. */
export function extractWatermark(imageEl) {
  try {
    const payload = extractPayload(imageEl);
    const text = new TextDecoder().decode(payload);
    if (text.startsWith('STEGWM|')) return text;
    return null;
  } catch { return null; }
}

// ─────────────────────────────────────────────
//  STEGANALYSIS
// ─────────────────────────────────────────────

/**
 * Chi-square test on LSB distribution.
 * A normal image has unequal pixel-value pair frequencies.
 * LSB steganography (especially with encrypted/random data) equalises them.
 *
 * Returns { chiSquare, probability, verdict }
 */
export function chiSquareTest(imageEl) {
  const canvas = document.createElement('canvas');
  canvas.width  = imageEl.width;
  canvas.height = imageEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageEl, 0, 0);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Count frequencies of each intensity value (R channel only, simplified)
  const freq = new Float64Array(256);
  for (let i = 0; i < px.length; i += 4) freq[px[i]]++;

  let chiSq = 0;
  let df = 0;
  for (let v = 0; v < 256; v += 2) {
    const expected = (freq[v] + freq[v + 1]) / 2;
    if (expected > 0) {
      chiSq += ((freq[v] - expected) ** 2 / expected) +
               ((freq[v + 1] - expected) ** 2 / expected);
      df++;
    }
  }

  // Heuristic probability estimate: chi-sq << df → equal pairs → likely stego
  // p close to 1 → stego likely; p close to 0 → clean
  const normalised = chiSq / Math.max(df, 1);
  const probability = Math.max(0, Math.min(100, 100 - (normalised / 2) * 100));

  let verdict = 'CLEAN';
  if (probability > 70) verdict = 'STEGO SUSPECTED';
  if (probability > 90) verdict = 'STEGO DETECTED';

  return { chiSquare: chiSq, degreesOfFreedom: df, probability, verdict };
}

/**
 * Generates a B&W LSB bit-plane image (white = LSB 1, black = LSB 0).
 * Returns a PNG data-URL.
 */
export function generateBitPlane(imageEl) {
  const canvas = document.createElement('canvas');
  canvas.width  = imageEl.width;
  canvas.height = imageEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageEl, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imgData.data;
  const out = new Uint8ClampedArray(px.length);
  for (let i = 0; i < px.length; i += 4) {
    const v = (px[i] & 1) ? 255 : 0;
    out[i] = out[i+1] = out[i+2] = v;
    out[i+3] = 255;
  }
  ctx.putImageData(new ImageData(out, canvas.width, canvas.height), 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Computes per-channel intensity histograms.
 * Returns { r, g, b } – each a 256-element Array.
 */
export function computeHistogram(imageEl) {
  const canvas = document.createElement('canvas');
  canvas.width  = imageEl.width;
  canvas.height = imageEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageEl, 0, 0);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  for (let i = 0; i < px.length; i += 4) {
    r[px[i]]++;
    g[px[i+1]]++;
    b[px[i+2]]++;
  }
  return { r, g, b };
}

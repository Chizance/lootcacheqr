// One-off icon generator — creates simple "cardboard box" PWA icons as raw PNGs.
// No image libraries needed: builds PNG chunks by hand using Node's built-in zlib.
// Run with: node scripts/generate-icons.cjs
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "public");

const BG = [194, 65, 12]; // --brand terracotta background
const BOX = [255, 214, 165]; // warm tan box body
const SEAM = [230, 160, 100]; // darker flap seam
const TAPE = [255, 237, 213]; // --brand-light tape stripe

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function buildPng(size, { boxInset, tapeWidthFrac, seamHeightFrac }) {
  const px = new Uint8Array(size * size * 4);
  const boxX = Math.round(size * boxInset);
  const boxY = Math.round(size * boxInset);
  const boxW = size - boxX * 2;
  const boxH = size - boxY * 2;
  const seamH = Math.round(boxH * seamHeightFrac);
  const tapeW = Math.round(boxW * tapeWidthFrac);
  const tapeX = Math.round(boxX + boxW / 2 - tapeW / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = BG;
      if (inRect(x, y, boxX, boxY, boxW, boxH)) {
        color = BOX;
        if (inRect(x, y, boxX, boxY, boxW, seamH)) color = SEAM;
        if (inRect(x, y, tapeX, boxY, tapeW, boxH)) color = TAPE;
      }
      const i = (y * size + x) * 4;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = 255;
    }
  }

  // Raw scanlines: filter byte (0) + RGBA bytes, per row
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    px.slice(y * size * 4, (y + 1) * size * 4).forEach((b, idx) => {
      raw[rowStart + 1 + idx] = b;
    });
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, boxInset: 0.18, tapeWidthFrac: 0.14, seamHeightFrac: 0.12 },
  { file: "icon-512.png", size: 512, boxInset: 0.18, tapeWidthFrac: 0.14, seamHeightFrac: 0.12 },
  { file: "icon-maskable-512.png", size: 512, boxInset: 0.3, tapeWidthFrac: 0.14, seamHeightFrac: 0.12 },
  { file: "apple-touch-icon.png", size: 180, boxInset: 0.18, tapeWidthFrac: 0.14, seamHeightFrac: 0.12 },
  { file: "favicon.png", size: 48, boxInset: 0.16, tapeWidthFrac: 0.16, seamHeightFrac: 0.14 },
];

for (const t of targets) {
  const png = buildPng(t.size, t);
  fs.writeFileSync(path.join(OUT_DIR, t.file), png);
  console.log(`Wrote ${t.file} (${t.size}x${t.size})`);
}

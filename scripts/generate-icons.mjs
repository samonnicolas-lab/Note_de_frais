// Génère des icônes PWA simples (PNG) sans dépendance externe : encodeur PNG minimal + dessin par pixels.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

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

function encodePNG(width, height, rgbaPixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgbaPixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const bg = [37, 99, 235]; // bleu
  const paper = [255, 255, 255];
  const line = [37, 99, 235];
  const coin = [253, 186, 61];

  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) set(x, y, bg);
  }

  const margin = maskable ? size * 0.22 : size * 0.16;
  const paperW = size - margin * 2;
  const paperH = paperW * 1.28;
  const px0 = margin;
  const py0 = (size - paperH) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= px0 && x < px0 + paperW && y >= py0 && y < py0 + paperH) {
        set(x, y, paper);
      }
    }
  }

  const lineH = Math.max(2, Math.round(size * 0.035));
  const lineMargin = paperW * 0.18;
  for (let li = 0; li < 4; li++) {
    const ly = py0 + paperH * (0.22 + li * 0.16);
    const lw = li === 3 ? paperW * 0.35 : paperW - lineMargin * 2;
    for (let y = ly; y < ly + lineH; y++) {
      for (let x = px0 + lineMargin; x < px0 + lineMargin + lw; x++) set(Math.round(x), Math.round(y), line);
    }
  }

  const cx = px0 + paperW * 0.72;
  const cy = py0 + paperH * 0.82;
  const r = paperW * 0.16;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) set(Math.round(cx + x), Math.round(cy + y), coin);
    }
  }

  return encodePNG(size, size, px);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makeIcon(192));
writeFileSync("public/icons/icon-512.png", makeIcon(512));
writeFileSync("public/icons/icon-maskable-192.png", makeIcon(192, { maskable: true }));
writeFileSync("public/icons/icon-maskable-512.png", makeIcon(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", makeIcon(180, { maskable: true }));
console.log("Icônes générées dans public/icons/");

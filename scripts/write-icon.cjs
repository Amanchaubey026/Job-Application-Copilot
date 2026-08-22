const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const take = crc & 1;
      crc = crc >>> 1;
      if (take) crc ^= 0xedb88320;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const size = 128;
const rows = [];
for (let y = 0; y < size; y += 1) {
  const row = Buffer.alloc(1 + size * 4);
  for (let x = 0; x < size; x += 1) {
    const i = 1 + x * 4;
    const dx = x - 64;
    const dy = y - 64;
    const inCircle = dx * dx + dy * dy <= 52 * 52;
    const inBrief =
      x >= 38 && x <= 90 && y >= 48 && y <= 92 && !(x >= 54 && x <= 74 && y < 56);
    const handle = x >= 54 && x <= 74 && y >= 40 && y <= 56;
    const check =
      y >= 70 &&
      y <= 96 &&
      x >= 70 &&
      ((x - 78) * 2 > 92 - y && x < 86 && y > 78
        ? false
        : x >= 74 && x <= 98 && Math.abs(x - (y - 20)) < 4 && y >= 78);
    row[i] = 15;
    row[i + 1] = 118;
    row[i + 2] = 110;
    row[i + 3] = inCircle ? 255 : 0;
    if (inCircle && (inBrief || handle)) {
      row[i] = 255;
      row[i + 1] = 255;
      row[i + 2] = 255;
    }
    if (inCircle && check) {
      row[i] = 255;
      row[i + 1] = 255;
      row[i + 2] = 255;
    }
  }
  rows.push(row);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const idat = zlib.deflateSync(Buffer.concat(rows));
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0))
]);

const dest = path.join(__dirname, "..", "assets", "icon.png");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, png);
console.log(`Wrote ${dest}`);

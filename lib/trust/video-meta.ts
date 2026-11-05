/**
 * Technical metadata from MP4 / MOV (ISO base media) files: duration,
 * resolution, codecs, frame rate, recording date, device and GPS.
 * Reads box headers only; never decodes frames. Pure and safe on any input.
 */

export type VideoMeta = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  bitrate: number | null;
  createdAt: string | null;
  make: string | null;
  model: string | null;
  software: string | null;
  gps: { lat: number; lon: number } | null;
  brand: string | null;
};

type Box = { type: string; start: number; end: number; body: number };

function boxes(buf: Buffer, start: number, end: number): Box[] {
  const out: Box[] = [];
  let off = start;
  while (off + 8 <= end && out.length < 2000) {
    let size = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("latin1");
    let header = 8;
    if (size === 1) {
      if (off + 16 > end) break;
      const big = buf.readBigUInt64BE(off + 8);
      if (big > BigInt(end - off)) break;
      size = Number(big);
      header = 16;
    } else if (size === 0) size = end - off;
    if (size < header || off + size > end) break;
    out.push({ type, start: off, end: off + size, body: off + header });
    off += size;
  }
  return out;
}

function find(buf: Buffer, list: Box[], path: string[]): Box | null {
  let cur: Box | undefined;
  let scope = list;
  for (const p of path) {
    cur = scope.find((b) => b.type === p);
    if (!cur) return null;
    scope = boxes(buf, cur.body, cur.end);
  }
  return cur ?? null;
}

const MAC_EPOCH = Date.UTC(1904, 0, 1);

function macDate(seconds: number): string | null {
  if (!seconds) return null;
  const t = MAC_EPOCH + seconds * 1000;
  const y = new Date(t).getUTCFullYear();
  return y >= 1990 && y <= 2100 ? new Date(t).toISOString() : null;
}

/** ISO 6709 "+46.8182+008.2275+1234.5/" to coordinates. */
export function iso6709(v: string): { lat: number; lon: number } | null {
  const m = /([+-]\d{1,2}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)/.exec(v);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0) ? { lat, lon } : null;
}

const CODECS: Record<string, string> = {
  avc1: "H.264 (AVC)", avc3: "H.264 (AVC)", hvc1: "H.265 (HEVC)", hev1: "H.265 (HEVC)", av01: "AV1",
  vp09: "VP9", mp4v: "MPEG-4 Part 2", "apch": "Apple ProRes 422 HQ", "apcn": "Apple ProRes 422", "ap4h": "Apple ProRes 4444",
  mp4a: "AAC", "ac-3": "Dolby Digital (AC-3)", "ec-3": "Dolby Digital Plus", opus: "Opus", alac: "Apple Lossless", fLaC: "FLAC", sowt: "PCM", lpcm: "PCM",
};

function textAfter(buf: Buffer, box: Box): string {
  // Classic QuickTime text atoms: 2-byte length, 2-byte language, then the text.
  const len = box.body + 4 <= box.end ? buf.readUInt16BE(box.body) : 0;
  const body = len > 0 && box.body + 4 + len <= box.end ? buf.subarray(box.body + 4, box.body + 4 + len) : buf.subarray(box.body, box.end);
  return body.toString("utf8").replace(/[\0-\x1f]/g, "").trim();
}

export function readVideoMeta(buf: Buffer): VideoMeta | null {
  if (buf.length < 16 || buf.subarray(4, 8).toString("latin1") !== "ftyp") return null;
  const top = boxes(buf, 0, buf.length);
  const brand = buf.subarray(8, 12).toString("latin1").trim() || null;
  const meta: VideoMeta = {
    durationSec: null, width: null, height: null, frameRate: null, videoCodec: null, audioCodec: null,
    bitrate: null, createdAt: null, make: null, model: null, software: null, gps: null, brand,
  };
  const moov = top.find((b) => b.type === "moov");
  if (!moov) return meta;
  const inMoov = boxes(buf, moov.body, moov.end);

  const mvhd = inMoov.find((b) => b.type === "mvhd");
  if (mvhd) {
    const v = buf[mvhd.body];
    const p = mvhd.body + 4;
    const created = v === 1 ? Number(buf.readBigUInt64BE(p)) : buf.readUInt32BE(p);
    const scale = v === 1 ? buf.readUInt32BE(p + 16) : buf.readUInt32BE(p + 8);
    const dur = v === 1 ? Number(buf.readBigUInt64BE(p + 20)) : buf.readUInt32BE(p + 12);
    meta.createdAt = macDate(created);
    if (scale > 0 && dur > 0) meta.durationSec = Math.round((dur / scale) * 100) / 100;
  }

  for (const trak of inMoov.filter((b) => b.type === "trak")) {
    const inTrak = boxes(buf, trak.body, trak.end);
    const hdlr = find(buf, inTrak, ["mdia", "hdlr"]);
    const handler = hdlr ? buf.subarray(hdlr.body + 8, hdlr.body + 12).toString("latin1") : "";
    const stsd = find(buf, inTrak, ["mdia", "minf", "stbl", "stsd"]);
    const fourcc = stsd && stsd.body + 16 <= stsd.end ? buf.subarray(stsd.body + 12, stsd.body + 16).toString("latin1") : "";
    if (handler === "vide" && !meta.videoCodec) {
      meta.videoCodec = CODECS[fourcc] ?? (fourcc.trim() || null);
      const tkhd = inTrak.find((b) => b.type === "tkhd");
      if (tkhd) {
        const v = buf[tkhd.body];
        const wOff = tkhd.body + (v === 1 ? 88 : 76);
        if (wOff + 8 <= tkhd.end) {
          const w = buf.readUInt32BE(wOff) / 65536;
          const h = buf.readUInt32BE(wOff + 4) / 65536;
          if (w > 0 && h > 0) {
            meta.width = Math.round(w);
            meta.height = Math.round(h);
          }
        }
      }
      if ((!meta.width || !meta.height) && stsd && stsd.body + 16 + 36 <= stsd.end) {
        const e = stsd.body + 8; // first sample entry
        meta.width = buf.readUInt16BE(e + 32) || meta.width;
        meta.height = buf.readUInt16BE(e + 34) || meta.height;
      }
      const mdhd = find(buf, inTrak, ["mdia", "mdhd"]);
      const stts = find(buf, inTrak, ["mdia", "minf", "stbl", "stts"]);
      if (mdhd && stts) {
        const v = buf[mdhd.body];
        const scale = v === 1 ? buf.readUInt32BE(mdhd.body + 4 + 16) : buf.readUInt32BE(mdhd.body + 4 + 8);
        const dur = v === 1 ? Number(buf.readBigUInt64BE(mdhd.body + 4 + 20)) : buf.readUInt32BE(mdhd.body + 4 + 12);
        const entries = buf.readUInt32BE(stts.body + 4);
        let samples = 0;
        for (let i = 0; i < entries && stts.body + 8 + i * 8 + 8 <= stts.end; i++) samples += buf.readUInt32BE(stts.body + 8 + i * 8);
        if (scale > 0 && dur > 0 && samples > 0) meta.frameRate = Math.round((samples / (dur / scale)) * 100) / 100;
      }
    } else if (handler === "soun" && !meta.audioCodec) {
      meta.audioCodec = CODECS[fourcc] ?? (fourcc.trim() || null);
    }
  }

  // Metadata: QuickTime "mdta" keys, iTunes-style ilst items, and classic udta text atoms.
  const apply = (name: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    const n = name.toLowerCase();
    if (n === "make" || n.endsWith(".make") || n === "\u00a9mak") meta.make ??= v.slice(0, 60);
    else if (n === "model" || n.endsWith(".model") || n === "\u00a9mod") meta.model ??= v.slice(0, 60);
    else if (n.endsWith(".software") || n === "\u00a9too" || n === "\u00a9swr" || n === "encoder") meta.software ??= v.slice(0, 80);
    else if (n.endsWith(".location.iso6709") || n === "\u00a9xyz" || n === "location") meta.gps ??= iso6709(v);
    else if ((n.endsWith(".creationdate") || n === "\u00a9day" || n === "date") && Number.isFinite(Date.parse(v))) meta.createdAt = new Date(Date.parse(v)).toISOString();
  };
  const readMeta = (metaBox: Box) => {
    const full = buf.subarray(metaBox.body + 4, metaBox.body + 8).toString("latin1") === "hdlr" || buf.readUInt32BE(metaBox.body) === 0;
    const list = boxes(buf, metaBox.body + (full ? 4 : 0), metaBox.end);
    const keys = list.find((b) => b.type === "keys");
    const ilst = list.find((b) => b.type === "ilst");
    if (!ilst) return;
    const names: string[] = [];
    if (keys) {
      const count = buf.readUInt32BE(keys.body + 4);
      let o = keys.body + 8;
      for (let i = 0; i < count && o + 8 <= keys.end; i++) {
        const size = buf.readUInt32BE(o);
        if (size < 8) break;
        names.push(buf.subarray(o + 8, o + size).toString("utf8"));
        o += size;
      }
    }
    for (const item of boxes(buf, ilst.body, ilst.end)) {
      const name = keys ? names[buf.readUInt32BE(item.start + 4) - 1] : item.type;
      const data = boxes(buf, item.body, item.end).find((b) => b.type === "data");
      if (name && data) apply(name, buf.subarray(data.body + 8, data.end).toString("utf8"));
    }
  };
  const metaTop = inMoov.find((b) => b.type === "meta");
  if (metaTop) readMeta(metaTop);
  const udta = inMoov.find((b) => b.type === "udta");
  if (udta) {
    for (const b of boxes(buf, udta.body, udta.end)) {
      if (b.type === "meta") readMeta(b);
      else if (b.type.startsWith("\u00a9")) apply(b.type, textAfter(buf, b));
    }
  }
  if (meta.durationSec && meta.durationSec > 0) meta.bitrate = Math.round((buf.length * 8) / meta.durationSec);
  return meta;
}


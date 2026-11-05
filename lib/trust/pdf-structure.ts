/**
 * Static PDF inspection without running anything: parses the object graph
 * (including compressed object streams), looks for real action dictionaries
 * (JavaScript, Launch, OpenAction, embedded files…) instead of raw byte
 * patterns, and extracts text page by page through each font's ToUnicode
 * map so modern PDFs (Typst, LaTeX, Chrome, Word) read correctly.
 *
 * Every limit is bounded (objects, decompressed bytes, pages, time) so a
 * hostile file can only make the result incomplete, never hang the scan.
 */
import { inflateSync } from "node:zlib";

type Obj = { dict: string; stream: Buffer | null; rawStream: boolean; streamFailed: boolean };

export type PdfSecurity = {
  javascript: number;
  launch: number;
  openAction: boolean;
  openActionKind: string | null;
  additionalActions: number;
  embeddedFiles: number;
  uriActions: number;
  externalHosts: string[];
  submitForm: number;
  richMedia: number;
  xfa: boolean;
  encrypted: boolean;
  malformedStreams: number;
  objects: number;
  objectStreams: number;
};

export type PdfPages = {
  total: number;
  /** Pages whose text was read. */
  withText: number;
  /** Pages with images but no readable text (would need OCR). */
  imageOnly: number;
  blank: number;
  /** Pages that hit an error or the processing limit. */
  failed: number;
  processed: number;
  /** Fonts with no usable Unicode map (text can't be decoded without OCR). */
  unmappedFonts: number;
  duplicatePages: number;
  /** % of pages inspected that yielded text or are genuinely blank. */
  coverage: number;
  truncated: boolean;
};

export type PdfStructure = {
  ok: boolean;
  error: string | null;
  security: PdfSecurity;
  pages: PdfPages;
  text: string;
  /** Text of the first pages, for title/structure detection. */
  head: string;
  outlineTitles: string[];
};

const LIMITS = { objects: 200_000, inflateTotal: 120_000_000, inflateOne: 16_000_000, pages: 3000, textChars: 1_500_000, ms: 9000 };

function decode(dict: string, body: Buffer, budget: { left: number }): Buffer | null {
  const filters = [...(/\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dict)?.[1] ?? "").matchAll(/\/(\w+)/g)].map((m) => m[1]);
  let out = body;
  for (const f of filters) {
    if (f === "FlateDecode" || f === "Fl") {
      if (budget.left <= 0) return null;
      try {
        out = inflateSync(out, { maxOutputLength: Math.min(LIMITS.inflateOne, budget.left) });
      } catch {
        // Some writers leave a truncated tail: try a raw-tolerant pass.
        try {
          out = inflateSync(out, { maxOutputLength: Math.min(LIMITS.inflateOne, budget.left), finishFlush: 2 /* Z_SYNC_FLUSH */ });
        } catch {
          return null;
        }
      }
      budget.left -= out.length;
    } else if (f === "ASCII85Decode" || f === "A85") {
      const a = ascii85(out.toString("latin1"));
      if (!a) return null;
      out = a;
    } else if (f === "ASCIIHexDecode" || f === "AHx") {
      out = Buffer.from(out.toString("latin1").replace(/>[\s\S]*$/, "").replace(/[^0-9a-f]/gi, ""), "hex");
    } else return null; // images (DCT/JPX/CCITT) and anything else: not text
  }
  if (/\/DecodeParms[^/]*\/Predictor\s*1[0-5]/.test(dict) || /\/Predictor\s*1[0-5]/.test(dict)) out = unpredict(out, dict);
  return out;
}

/** PNG predictors used by xref/object streams. */
function unpredict(buf: Buffer, dict: string): Buffer {
  const cols = Number(/\/Columns\s+(\d+)/.exec(dict)?.[1] ?? 1);
  const row = cols + 1;
  if (!cols || buf.length % row !== 0) return buf;
  const out = Buffer.alloc((buf.length / row) * cols);
  const prev = Buffer.alloc(cols);
  for (let r = 0; r < buf.length / row; r++) {
    const type = buf[r * row];
    for (let i = 0; i < cols; i++) {
      const x = buf[r * row + 1 + i];
      const a = i > 0 ? out[r * cols + i - 1] : 0;
      const b = prev[i];
      const c = i > 0 ? (r > 0 ? out[(r - 1) * cols + i - 1] : 0) : 0;
      let v = x;
      if (type === 1) v = x + a;
      else if (type === 2) v = x + b;
      else if (type === 3) v = x + ((a + b) >> 1);
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[r * cols + i] = v & 255;
    }
    out.copy(prev, 0, r * cols, r * cols + cols);
  }
  return out;
}

export function ascii85(input: string): Buffer | null {
  const src = input.replace(/^\s*<~/, "").replace(/~>[\s\S]*$/, "").replace(/\s+/g, "");
  const out: number[] = [];
  let group: number[] = [];
  for (const ch of src) {
    if (ch === "z" && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) return null;
    group.push(c);
    if (group.length === 5) {
      const v = group.reduce((a, d) => a * 85 + d, 0);
      out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      group = [];
    }
  }
  if (group.length) {
    const n = group.length;
    while (group.length < 5) group.push(84);
    const v = group.reduce((a, d) => a * 85 + d, 0);
    out.push(...[(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].slice(0, n - 1));
  }
  return Buffer.from(out);
}

/** Finds every "N G obj … endobj", splitting dictionary text from stream data. */
function readObjects(buf: Buffer, raw: string, budget: { left: number }, deadline: number): { objs: Map<number, Obj>; trailer: string; objectStreams: number; malformed: number } {
  const objs = new Map<number, Obj>();
  let malformed = 0;
  let objectStreams = 0;
  const re = /(?:^|[\r\n\s>])(\d{1,7})\s+(\d{1,5})\s+obj\b/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(raw)) && count++ < LIMITS.objects) {
    if (Date.now() > deadline) break;
    const num = Number(m[1]);
    const start = m.index + m[0].length;
    const sIdx = raw.indexOf("stream", start);
    const eIdx = raw.indexOf("endobj", start);
    const end = eIdx < 0 ? raw.length : eIdx;
    if (sIdx >= 0 && sIdx < end && raw.slice(sIdx - 3, sIdx) !== "end") {
      const dict = raw.slice(start, sIdx);
      let dataStart = sIdx + 6;
      if (raw[dataStart] === "\r") dataStart++;
      if (raw[dataStart] === "\n") dataStart++;
      const len = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
      let dataEnd = len ? dataStart + Number(len[1]) : -1;
      if (dataEnd < 0 || raw.slice(dataEnd, dataEnd + 30).indexOf("endstream") < 0) dataEnd = raw.indexOf("endstream", dataStart);
      if (dataEnd < 0) { malformed++; continue; }
      const body = buf.subarray(dataStart, dataEnd);
      const isText = !/\/Subtype\s*\/Image|\/FontFile|\/Length1|\/DCTDecode|\/JPXDecode|\/CCITT/.test(dict);
      const decoded = isText ? decode(dict, body, budget) : null;
      const failed = isText && decoded == null && /\/Filter/.test(dict) && !/\/DCT|\/JPX|\/CCITT|\/JBIG2/.test(dict);
      if (failed) malformed++;
      objs.set(num, { dict, stream: decoded, rawStream: !isText, streamFailed: failed });
      re.lastIndex = Math.max(re.lastIndex, dataEnd);
    } else {
      objs.set(num, { dict: raw.slice(start, end), stream: null, rawStream: false, streamFailed: false });
    }
  }
  // Compressed object streams hold most dictionaries in modern PDFs.
  for (const [, o] of [...objs]) {
    if (!/\/Type\s*\/ObjStm/.test(o.dict) || !o.stream) continue;
    objectStreams++;
    const n = Number(/\/N\s+(\d+)/.exec(o.dict)?.[1] ?? 0);
    const first = Number(/\/First\s+(\d+)/.exec(o.dict)?.[1] ?? 0);
    const s = o.stream.toString("latin1");
    const nums = s.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < Math.min(n, 20000) && i * 2 + 1 < nums.length; i++) {
      const on = nums[i * 2];
      const off = first + nums[i * 2 + 1];
      const next = i + 1 < n && i * 2 + 3 < nums.length ? first + nums[i * 2 + 3] : s.length;
      if (!objs.has(on)) objs.set(on, { dict: s.slice(off, next), stream: null, rawStream: false, streamFailed: false });
    }
  }
  const trailers = [...raw.matchAll(/trailer\s*(<<[\s\S]{0,2000}?>>)/g)].map((t) => t[1]);
  const xrefStream = [...objs.values()].filter((o) => /\/Type\s*\/XRef/.test(o.dict)).map((o) => o.dict);
  return { objs, trailer: [...trailers, ...xrefStream].join("\n"), objectStreams, malformed };
}

const ref = (s: string, key: string): number | null => {
  const m = new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`).exec(s);
  return m ? Number(m[1]) : null;
};

/** The "<< … >>" value of a key, resolving one level of indirection. */
function dictValue(objs: Map<number, Obj>, s: string, key: string): string | null {
  const i = s.search(new RegExp(`/${key}\\s*(<<|\\d+\\s+\\d+\\s+R)`));
  if (i < 0) return null;
  const rest = s.slice(i + key.length + 1).trimStart();
  if (rest.startsWith("<<")) {
    let depth = 0;
    for (let k = 0; k < rest.length; k++) {
      if (rest[k] === "<" && rest[k + 1] === "<") { depth++; k++; }
      else if (rest[k] === ">" && rest[k + 1] === ">") { depth--; k++; if (depth === 0) return rest.slice(0, k + 1); }
    }
    return rest;
  }
  const r = /^(\d+)\s+\d+\s+R/.exec(rest);
  return r ? (objs.get(Number(r[1]))?.dict ?? null) : null;
}

type Font = { map: Map<string, string> | null; codeLen: number; composite: boolean; single: boolean };

function parseCMap(s: string): { map: Map<string, string>; codeLen: number } {
  const map = new Map<string, string>();
  const hexToStr = (h: string) => {
    let out = "";
    for (let i = 0; i + 3 < h.length + 1; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4).padEnd(4, "0"), 16));
    return out;
  };
  let codeLen = 0;
  for (const cs of s.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) {
    const first = /<([0-9a-fA-F]+)>/.exec(cs[1]);
    if (first) codeLen = Math.max(codeLen, first[1].length / 2);
  }
  for (const block of s.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(p[1].toLowerCase(), hexToStr(p[2]));
  }
  for (const block of s.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]*)>|\[([^\]]*)\])/g)) {
      const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16), w = p[1].length;
      if (hi - lo > 65535) continue;
      if (p[4] !== undefined) {
        const base = p[4];
        const head = base.slice(0, -4), tail = parseInt(base.slice(-4) || "0", 16);
        for (let c = lo; c <= hi; c++) map.set(c.toString(16).padStart(w, "0"), hexToStr(head) + String.fromCharCode(tail + (c - lo)));
      } else {
        const items = [...(p[5] ?? "").matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => x[1]);
        items.forEach((v, k) => map.set((lo + k).toString(16).padStart(w, "0"), hexToStr(v)));
      }
    }
  }
  return { map, codeLen: codeLen || 2 };
}

function fontsFor(objs: Map<number, Obj>, resources: string | null, cache: Map<number, Font>): Map<string, Font> {
  const out = new Map<string, Font>();
  if (!resources) return out;
  const fd = dictValue(objs, resources, "Font");
  if (!fd) return out;
  for (const m of fd.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
    const num = Number(m[2]);
    let font = cache.get(num);
    if (!font) {
      const fdict = objs.get(num)?.dict ?? "";
      const composite = /\/Subtype\s*\/Type0/.test(fdict);
      const tu = ref(fdict, "ToUnicode");
      const cm = tu != null ? objs.get(tu)?.stream : null;
      if (cm) {
        const p = parseCMap(cm.toString("latin1"));
        font = { map: p.map, codeLen: composite ? p.codeLen : 1, composite, single: !composite };
      } else font = { map: null, codeLen: composite ? 2 : 1, composite, single: !composite };
      cache.set(num, font);
    }
    out.set(m[1], font);
  }
  return out;
}

/** Bytes of a PDF string token. */
function strBytes(tok: string): number[] {
  if (tok.startsWith("<")) {
    const hex = tok.slice(1, -1).replace(/[^0-9a-f]/gi, "");
    const b: number[] = [];
    for (let i = 0; i + 1 < hex.length; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));
    if (hex.length % 2) b.push(parseInt(hex.slice(-1) + "0", 16));
    return b;
  }
  const body = tok.slice(1, -1);
  const b: number[] = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== "\\") { b.push(body.charCodeAt(i) & 0xff); continue; }
    const nx = body[++i];
    if (nx === undefined) break;
    if (/[0-7]/.test(nx)) {
      let oct = nx;
      while (oct.length < 3 && /[0-7]/.test(body[i + 1] ?? "")) oct += body[++i];
      b.push(parseInt(oct, 8) & 0xff);
    } else if (nx === "n") b.push(10);
    else if (nx === "r") b.push(13);
    else if (nx === "t") b.push(9);
    else if (nx === "b") b.push(8);
    else if (nx === "f") b.push(12);
    else if (nx === "\n" || nx === "\r") continue;
    else b.push(nx.charCodeAt(0) & 0xff);
  }
  return b;
}

function showText(bytes: number[], font: Font | undefined, stats: { unmapped: number }): string {
  if (!font) return Buffer.from(bytes).toString("latin1");
  if (font.map) {
    let out = "";
    const len = font.codeLen;
    for (let i = 0; i + len <= bytes.length; i += len) {
      let key = "";
      for (let k = 0; k < len; k++) key += bytes[i + k].toString(16).padStart(2, "0");
      const u = font.map.get(key);
      if (u != null) out += u;
      else if (len === 1) out += String.fromCharCode(bytes[i]);
      else stats.unmapped++;
    }
    return out;
  }
  if (font.composite) { stats.unmapped += bytes.length / 2; return ""; }
  return Buffer.from(bytes).toString("latin1");
}

/** Walks one content stream: tracks the current font, collects shown text, notes painted images. */
function contentText(content: string, fonts: Map<string, Font>, xobjects: Set<string>, stats: { unmapped: number }): { text: string; images: number } {
  let out = "";
  let images = 0;
  const stack: string[] = [];
  let font: Font | undefined;
  let y = 0;
  let cmY = 0;
  const saved: number[] = [];
  let lineY: number | null = null;
  const emit = (t: string) => {
    if (!t) return;
    const at = cmY + y;
    if (lineY != null && Math.abs(at - lineY) > 0.5 && out && !/\s$/.test(out)) out += "\n";
    lineY = at;
    out += t;
  };
  const n = content.length;
  let i = 0;
  while (i < n) {
    const c = content[i];
    if (c === " " || c === "\n" || c === "\r" || c === "\t" || c === "\f" || c === "\0") { i++; continue; }
    if (c === "%") { while (i < n && content[i] !== "\n" && content[i] !== "\r") i++; continue; }
    if (c === "(") {
      let depth = 0, j = i;
      for (; j < n; j++) {
        const ch = content[j];
        if (ch === "\\") { j++; continue; }
        if (ch === "(") depth++;
        else if (ch === ")" && --depth === 0) break;
      }
      stack.push(content.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === "<" && content[i + 1] !== "<") {
      const j = content.indexOf(">", i);
      stack.push(content.slice(i, j < 0 ? n : j + 1));
      i = j < 0 ? n : j + 1;
      continue;
    }
    if (c === "<" || c === ">") { i += 2; continue; }
    if (c === "[") { stack.push("["); i++; continue; }
    if (c === "]") {
      const items: string[] = [];
      while (stack.length && stack[stack.length - 1] !== "[") items.unshift(stack.pop()!);
      stack.pop();
      stack.push(`\u0001${JSON.stringify(items)}`);
      i++;
      continue;
    }
    if (c === "/") {
      let j = i + 1;
      while (j < n && !/[\s/<>[\]()%{}]/.test(content[j])) j++;
      stack.push(content.slice(i, j));
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !/[\s/<>[\]()%{}]/.test(content[j])) j++;
    if (j === i) { i++; continue; }
    const tok = content.slice(i, j);
    i = j;
    if (/^[-+.\d]/.test(tok)) { stack.push(tok); continue; }
    switch (tok) {
      case "Tf": {
        const name = stack[stack.length - 2];
        font = name ? fonts.get(name.slice(1)) : undefined;
        break;
      }
      case "Tj":
      case "'":
      case '"': {
        const s = stack[stack.length - 1];
        if (tok !== "Tj") y -= 1000;
        if (s && (s[0] === "(" || s[0] === "<")) emit(showText(strBytes(s), font, stats));
        break;
      }
      case "TJ": {
        const s = stack[stack.length - 1];
        if (s?.[0] === "\u0001") {
          for (const part of JSON.parse(s.slice(1)) as string[]) {
            if (part[0] === "(" || part[0] === "<") emit(showText(strBytes(part), font, stats));
            else if (Number(part) < -180 && out && !/\s$/.test(out)) out += " ";
          }
        }
        break;
      }
      // Line breaks come from vertical moves only: many writers (Typst, LaTeX)
      // position every glyph run, so a horizontal move is not a word break.
      case "Td": case "TD": {
        const ty = Number(stack[stack.length - 1]);
        if (Number.isFinite(ty)) y += ty;
        break;
      }
      case "Tm": {
        const f = Number(stack[stack.length - 1]);
        if (Number.isFinite(f)) y = f;
        break;
      }
      case "T*":
        y -= 1000;
        break;
      case "BT":
        y = 0;
        break;
      case "q":
        if (saved.length < 64) saved.push(cmY);
        break;
      case "Q":
        cmY = saved.pop() ?? 0;
        break;
      case "cm": {
        const f = Number(stack[stack.length - 1]);
        if (Number.isFinite(f)) cmY += f;
        break;
      }
      case "Do": {
        const name = stack[stack.length - 1];
        if (name && xobjects.has(name.slice(1))) images++;
        break;
      }
      case "BI": {
        const k = content.indexOf("EI", i);
        images++;
        i = k < 0 ? n : k + 2;
        break;
      }
    }
    stack.length = 0;
  }
  return { text: out, images };
}

function pageList(objs: Map<number, Obj>, trailer: string): number[] {
  const root = ref(trailer, "Root");
  const pagesRoot = root != null ? ref(objs.get(root)?.dict ?? "", "Pages") : null;
  const out: number[] = [];
  const seen = new Set<number>();
  const walk = (num: number, depth: number) => {
    if (depth > 50 || seen.has(num) || out.length >= LIMITS.pages * 2) return;
    seen.add(num);
    const d = objs.get(num)?.dict ?? "";
    if (/\/Type\s*\/Pages\b/.test(d)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(d)?.[1] ?? "";
      for (const k of kids.matchAll(/(\d+)\s+\d+\s+R/g)) walk(Number(k[1]), depth + 1);
    } else if (/\/Type\s*\/Page\b/.test(d)) out.push(num);
  };
  if (pagesRoot != null) walk(pagesRoot, 0);
  if (!out.length) for (const [num, o] of objs) if (/\/Type\s*\/Page\b/.test(o.dict)) out.push(num);
  return out;
}

function inherited(objs: Map<number, Obj>, page: string): string | null {
  let d: string | undefined = page;
  for (let k = 0; d && k < 30; k++) {
    const r = dictValue(objs, d, "Resources");
    if (r) return r;
    const parent = ref(d, "Parent");
    d = parent != null ? objs.get(parent)?.dict : undefined;
  }
  return null;
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const memo = new WeakMap<Buffer, PdfStructure>();

export function inspectPdf(buf: Buffer): PdfStructure {
  const hit = memo.get(buf);
  if (hit) return hit;
  const r = inspectPdfUncached(buf);
  memo.set(buf, r);
  return r;
}

function inspectPdfUncached(buf: Buffer): PdfStructure {
  const deadline = Date.now() + LIMITS.ms;
  const raw = buf.toString("latin1");
  const budget = { left: LIMITS.inflateTotal };
  const empty: PdfPages = { total: 0, withText: 0, imageOnly: 0, blank: 0, failed: 0, processed: 0, unmappedFonts: 0, duplicatePages: 0, coverage: 0, truncated: false };
  let parsed: ReturnType<typeof readObjects>;
  try {
    parsed = readObjects(buf, raw, budget, deadline);
  } catch (e) {
    return {
      ok: false, error: e instanceof Error ? e.message : "parse error", text: "", head: "", outlineTitles: [], pages: empty,
      security: { javascript: 0, launch: 0, openAction: false, openActionKind: null, additionalActions: 0, embeddedFiles: 0, uriActions: 0, externalHosts: [], submitForm: 0, richMedia: 0, xfa: false, encrypted: false, malformedStreams: 0, objects: 0, objectStreams: 0 },
    };
  }
  const { objs, trailer, objectStreams, malformed } = parsed;

  // Security: only dictionary text (never raw stream bytes).
  const dicts = [...objs.values()].map((o) => o.dict);
  const all = dicts.join("\n");
  const count = (re: RegExp) => (all.match(re) ?? []).length;
  const uris = [...all.matchAll(/\/URI\s*(\((?:\\.|[^\\)]){1,500}\)|<[0-9a-fA-F\s]{2,1000}>)/g)].map((m) => decodeTextString(m[1]));
  const hosts = [...new Set(uris.map(host).filter((h): h is string => Boolean(h)))];
  const root = ref(trailer, "Root");
  const catalog = root != null ? (objs.get(root)?.dict ?? "") : (dicts.find((d) => /\/Type\s*\/Catalog/.test(d)) ?? "");
  const oa = dictValue(objs, catalog, "OpenAction") ?? (/\/OpenAction\s*\[/.test(catalog) ? "[dest]" : null);
  const openActionKind = oa == null ? null : oa === "[dest]" ? "Go to page" : /\/S\s*\/JavaScript/.test(oa) ? "JavaScript" : /\/S\s*\/Launch/.test(oa) ? "Launch" : /\/S\s*\/URI/.test(oa) ? "Open web link" : /\/S\s*\/GoTo/.test(oa) || /\[/.test(oa) ? "Go to page" : "Other action";
  const security: PdfSecurity = {
    javascript: Math.max(count(/\/S\s*\/JavaScript\b/g), count(/\/JS\s*(?:\(|<|\d+\s+\d+\s+R)/g)),
    launch: count(/\/S\s*\/Launch\b/g),
    openAction: oa != null,
    openActionKind,
    additionalActions: count(/\/AA\s*(?:<<|\d+\s+\d+\s+R)/g),
    embeddedFiles: Math.max(count(/\/Type\s*\/EmbeddedFile\b/g), count(/\/EmbeddedFiles\s*(?:<<|\d+\s+\d+\s+R)/g)),
    uriActions: uris.length,
    externalHosts: hosts.slice(0, 20),
    submitForm: count(/\/S\s*\/(?:SubmitForm|ImportData)\b/g),
    richMedia: count(/\/Subtype\s*\/(?:RichMedia|Flash|Movie|Sound)\b/g),
    xfa: /\/XFA\s*(?:\[|\d+\s+\d+\s+R)/.test(all),
    encrypted: /\/Encrypt\s*(?:<<|\d+\s+\d+\s+R)/.test(trailer),
    malformedStreams: malformed,
    objects: objs.size,
    objectStreams,
  };

  // Text, page by page.
  const pageNums = pageList(objs, trailer);
  const pages: PdfPages = { ...empty, total: pageNums.length };
  const fontCache = new Map<number, Font>();
  const texts: string[] = [];
  const hashes = new Map<string, number>();
  let chars = 0;
  for (const pn of pageNums) {
    if (pages.processed >= LIMITS.pages || Date.now() > deadline || chars > LIMITS.textChars) { pages.truncated = true; break; }
    pages.processed++;
    try {
      const pd = objs.get(pn)?.dict ?? "";
      const res = inherited(objs, pd);
      const fonts = fontsFor(objs, res, fontCache);
      const xo = new Set<string>();
      const xd = res ? dictValue(objs, res, "XObject") : null;
      if (xd) for (const m of xd.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) if (/\/Subtype\s*\/Image/.test(objs.get(Number(m[2]))?.dict ?? "")) xo.add(m[1]);
      const contentsRefs = /\/Contents\s*\[([^\]]*)\]/.exec(pd)?.[1] ?? /\/Contents\s+(\d+\s+\d+\s+R)/.exec(pd)?.[1] ?? "";
      let content = "";
      let missing = false;
      for (const r of contentsRefs.matchAll(/(\d+)\s+\d+\s+R/g)) {
        const o = objs.get(Number(r[1]));
        if (o?.stream) content += `${o.stream.toString("latin1")}\n`;
        else if (o?.streamFailed || !o) missing = true;
        else if (o && !o.stream && /\[/.test(o.dict)) {
          // Contents pointing to an array object.
          for (const r2 of o.dict.matchAll(/(\d+)\s+\d+\s+R/g)) {
            const o2 = objs.get(Number(r2[1]));
            if (o2?.stream) content += `${o2.stream.toString("latin1")}\n`;
          }
        }
      }
      const stats = { unmapped: 0 };
      const { text, images } = contentText(content, fonts, xo, stats);
      const clean = text.replace(/[^\S\n]+/g, " ").replace(/\n{2,}/g, "\n").trim();
      const letters = (clean.match(/\p{L}/gu) ?? []).length;
      if (letters >= 3) {
        pages.withText++;
        texts.push(clean);
        chars += clean.length;
        if (clean.length > 200) {
          const key = clean.slice(0, 400);
          hashes.set(key, (hashes.get(key) ?? 0) + 1);
        }
      } else if (missing) pages.failed++;
      else if (images > 0 || stats.unmapped > 0) pages.imageOnly++;
      else pages.blank++;
    } catch {
      pages.failed++;
    }
  }
  pages.unmappedFonts = [...fontCache.values()].filter((f) => f.composite && !f.map).length;
  pages.duplicatePages = [...hashes.values()].reduce((s, v) => s + (v > 1 ? v - 1 : 0), 0);
  pages.coverage = pages.total ? Math.round(((pages.withText + pages.blank) / pages.total) * 100) : 0;

  const outline: string[] = [];
  for (const o of objs.values()) {
    if (outline.length >= 60) break;
    if (/\/Parent\s+\d+\s+\d+\s+R/.test(o.dict) && /\/Title\s*[(<]/.test(o.dict) && (/\/Dest\b|\/A\s*(<<|\d)/.test(o.dict)) && !/\/Type\s*\/Page/.test(o.dict)) {
      const t = /\/Title\s*(\((?:\\.|[^\\)]){0,300}\)|<[0-9a-fA-F\s]{0,600}>)/.exec(o.dict)?.[1];
      if (t) outline.push(decodeTextString(t));
    }
  }

  return { ok: true, error: null, security, pages, text: texts.join("\n\n"), head: texts.slice(0, 6).join("\n\n").slice(0, 6000), outlineTitles: outline.filter(Boolean) };
}

/** A PDF text string (bookmarks, metadata): PDFDocEncoding or UTF-16BE. */
export function decodeTextString(tok: string): string {
  const b = strBytes(tok);
  if (b[0] === 0xfe && b[1] === 0xff) {
    let s = "";
    for (let i = 2; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
    return s.replace(/\0/g, "").trim();
  }
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return Buffer.from(b.slice(3)).toString("utf8").trim();
  return Buffer.from(b).toString("latin1").replace(/\0/g, "").trim();
}

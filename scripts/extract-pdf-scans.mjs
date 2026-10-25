// The 2019 National Guidelines for Rabies Prophylaxis are a scanned PDF with no text layer.
// This saves each page's scan, in page order, as the JPEG it is stored as (no re-encoding),
// so the pages can be read and the app's medical content checked against them.
//
//   node scripts/extract-pdf-scans.mjs data-sources/nrcp-guidelines-2019.pdf <out-dir>
//
// Handles the plain (uncompressed) object layout that this scan uses; it is not a general
// PDF parser.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [file, outDir] = process.argv.slice(2);
if (!file || !outDir) {
  console.error('usage: node scripts/extract-pdf-scans.mjs <file.pdf> <out-dir>');
  process.exit(1);
}
const buf = readFileSync(file);
const s = buf.toString('latin1');

// Object number -> offset just after "N G obj". Later definitions win (incremental updates).
const offsets = new Map();
for (const m of s.matchAll(/(\d+)\s+\d+\s+obj\b/g)) offsets.set(Number(m[1]), m.index + m[0].length);

function dict(n) {
  const start = offsets.get(n);
  if (start === undefined) throw new Error(`object ${n} not found`);
  const stream = s.indexOf('stream', start);
  const end = s.indexOf('endobj', start);
  return s.slice(start, stream !== -1 && stream < end ? stream : end);
}
const ref = (text, key) => {
  const m = text.match(new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`));
  return m ? Number(m[1]) : null;
};
/** The text of a dictionary-valued key, following an indirect reference if there is one. */
function sub(text, key) {
  const n = ref(text, key);
  if (n !== null) return dict(n);
  const at = text.indexOf(`/${key}`);
  if (at === -1) return '';
  let i = text.indexOf('<<', at);
  let depth = 0;
  const from = i;
  for (; i < text.length; i++) {
    if (text.startsWith('<<', i)) (depth++, i++);
    else if (text.startsWith('>>', i)) {
      depth--;
      i++;
      if (depth === 0) break;
    }
  }
  return text.slice(from, i + 1);
}

function pages(n, out = []) {
  const d = dict(n);
  if (/\/Type\s*\/Pages\b/.test(d)) {
    const kids = d.match(/\/Kids\s*\[([^\]]*)\]/)[1];
    for (const k of kids.matchAll(/(\d+)\s+\d+\s+R/g)) pages(Number(k[1]), out);
  } else out.push(n);
  return out;
}

function streamOf(n) {
  const d = dict(n);
  const lenRef = ref(d, 'Length');
  const length = lenRef !== null ? Number(dict(lenRef).trim()) : Number(d.match(/\/Length\s+(\d+)/)[1]);
  let at = s.indexOf('stream', offsets.get(n)) + 'stream'.length;
  if (s[at] === '\r') at++;
  if (s[at] === '\n') at++;
  return { filter: (d.match(/\/Filter\s*\/(\w+)/) || [])[1], bytes: buf.subarray(at, at + length) };
}

const catalog = [...offsets.keys()].find((n) => /\/Type\s*\/Catalog\b/.test(dict(n)));
const order = pages(ref(dict(catalog), 'Pages'));
mkdirSync(outDir, { recursive: true });
order.forEach((pageObj, i) => {
  const page = dict(pageObj);
  const xobjects = sub(sub(page, 'Resources'), 'XObject');
  const byName = new Map([...xobjects.matchAll(/\/([\w.]+)\s+(\d+)\s+\d+\s+R/g)].map((m) => [m[1], Number(m[2])]));
  // Pages share one resource dictionary, so only the images a page's content draws count.
  const contents = page.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/)[1];
  const drawn = [...contents.matchAll(/(\d+)\s+\d+\s+R/g)].flatMap((c) => {
    const { filter, bytes } = streamOf(Number(c[1]));
    if (filter) throw new Error(`page ${i + 1}: compressed content stream (${filter}) is not handled`);
    return [...bytes.toString('latin1').matchAll(/\/([\w.]+)\s+Do\b/g)].map((m) => m[1]);
  });
  const images = drawn.map((name) => byName.get(name)).filter((n) => n !== undefined);
  images.forEach((img, j) => {
    const { filter, bytes } = streamOf(img);
    const name = `page-${String(i + 1).padStart(2, '0')}${images.length > 1 ? `-${j + 1}` : ''}`;
    if (filter === 'DCTDecode') writeFileSync(join(outDir, `${name}.jpg`), bytes);
    else console.log(`${name}: skipped, image filter ${filter ?? 'none'}`);
  });
  if (images.length === 0) console.log(`page ${i + 1}: no images`);
});
console.log(`${order.length} pages -> ${outDir}`);

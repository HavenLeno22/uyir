// Turns an official PDF into plain text, so every medical statement and every clinic in the
// app can be checked line by line against its source.
//
//   node scripts/extract-pdf-text.mjs data-sources/nrcp-guidelines-2019.pdf
//   node scripts/extract-pdf-text.mjs data-sources/nrcp-anti-rabies-clinics-2026-02.pdf --layout
//
// Writes <name>.txt next to the PDF. --layout keeps the horizontal position of each piece of
// text (one character per ~4.5 pt), which is what the clinic table parser needs.
import { readFile, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/extract-pdf-text.mjs <file.pdf> [--layout]');
  process.exit(1);
}
const layout = flags.includes('--layout');
const CHAR_PT = 4.5;

const data = new Uint8Array(await readFile(file));
const pdf = await getDocument({ data, useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;

/** Groups text items into lines (same baseline within a tolerance), top to bottom. */
function toLines(items) {
  const rows = [];
  for (const it of items) {
    if (!('str' in it) || it.str === '') continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const size = Math.hypot(it.transform[2], it.transform[3]) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, size * 0.35));
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, w: it.width, str: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let out = '';
    let end = null;
    for (const p of r.parts) {
      if (layout) {
        const col = Math.round(p.x / CHAR_PT);
        out = out.length < col ? out.padEnd(col) : out.length > 0 && !out.endsWith(' ') ? out + ' ' : out;
      } else if (end !== null) {
        const gap = p.x - end;
        if (gap > 12) out += ' | ';
        else if (gap > 1 && !out.endsWith(' ') && !p.str.startsWith(' ')) out += ' ';
      }
      out += p.str;
      end = p.x + p.w;
    }
    return out.trimEnd();
  });
}

const pages = [];
for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n);
  const content = await page.getTextContent();
  pages.push(`=== page ${n} ===\n${toLines(content.items).join('\n')}`);
}
const outFile = file.replace(/\.pdf$/i, layout ? '.layout.txt' : '.txt');
await writeFile(outFile, pages.join('\n\n') + '\n', 'utf8');
console.log(`${file}: ${pdf.numPages} pages -> ${outFile}`);

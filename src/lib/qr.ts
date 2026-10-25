// QR code as SVG path data. UTF-8, so names typed in Tamil or Hindi survive.
import qrcode from 'qrcode-generator';

export function qrPath(text: string): { size: number; d: string } {
  const previous = qrcode.stringToBytes;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      // One rectangle per run of dark modules in a row keeps the path short.
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        let run = 1;
        while (c + run < n && qr.isDark(r, c + run)) run++;
        d += `M${c} ${r}h${run}v1h-${run}z`;
        c += run - 1;
      }
    }
    return { size: n, d };
  } finally {
    qrcode.stringToBytes = previous;
  }
}

// Sending dates to people and files to the phone. Nothing goes to a server of ours: these open
// WhatsApp, the SMS app or the calendar with the text filled in, and the person sends it.

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** `sms:?&body=` opens the SMS app with the text on both Android and iPhone. */
export const smsUrl = (text: string) => `sms:?&body=${encodeURIComponent(text)}`;

export function downloadFile(name: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Google Maps search for a facility by name, which finds the real building. */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsDirectionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

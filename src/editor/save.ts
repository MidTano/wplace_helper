import { markElement } from '../wguard';

export function downloadBlob(blob: Blob, filename = 'wplace-edited.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); markElement(a);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch {}
    try { a.remove(); } catch {}
  }, 1500);
}

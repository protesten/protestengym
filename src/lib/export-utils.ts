import html2canvas from 'html2canvas';

export async function exportElementAsImage(element: HTMLElement, filename: string = 'export.png') {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0d0f14',
    scale: 2,
    useCORS: true,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function shareElementAsImage(element: HTMLElement, title: string = 'Mi entrenamiento') {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0d0f14',
    scale: 2,
    useCORS: true,
  });
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;

  if (navigator.share && navigator.canShare) {
    const file = new File([blob], 'workout.png', { type: 'image/png' });
    try {
      await navigator.share({ title, files: [file] });
      return true;
    } catch {
      // User cancelled or not supported
    }
  }
  // Fallback: download
  const link = document.createElement('a');
  link.download = 'workout.png';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

export function exportAsCSV(headers: string[], rows: string[][], filename: string = 'export.csv') {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

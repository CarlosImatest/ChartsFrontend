import { Layer } from '../models/chart.model';

/**
 * Builds a CSV matching the original spreadsheet convention: first
 * row is the layer name, followed by one value per row — mirroring
 * how layers were structured in the source Google Sheets (first cell
 * = name, rest = values).
 */
export function layerToCsv(layer: Layer): string {
  const rows = [...layer.values.map(v => String(v))];
  return rows.join('\n');
}

/** Strips characters that aren't safe in filenames across OSes. */
export function sanitizeFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'chart';
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
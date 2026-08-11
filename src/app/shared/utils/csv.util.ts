import { ChartType, Layer } from '../models/chart.model';
import { ChartListComponent } from '../../features/charts/chart-list/chart-list.component';


/**
 * Builds a CSV matching the original spreadsheet convention: first
 * row is the layer name, followed by one value per row — mirroring
 * how layers were structured in the source Google Sheets (first cell
 * = name, rest = values).
 */
export function layerToCsv(layer: Layer, chartType: ChartType): string {

  //need to test if this works of VISNIR
  const rows = [...layer.values.map(v => String(v))];
  if (chartType !== ChartType.VISNIR) {
    rows.splice(-2); // remove min/max rows
  }

  console.log(chartType);

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
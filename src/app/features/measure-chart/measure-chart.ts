import { Component, signal, computed, inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartService } from '../../core/services/chart.service';
import { ChartType } from '../../shared/models/chart.model';
import { CHART_PRESETS } from '../../shared/models/chart-preset.model';
import { ChartResponse } from '../../shared/models/chart.model';

interface EditableLayer {
  name: string;
  values: (number | null)[];
  activeStart: number;
  activeEnd: number;
}

const TRAILING_LABELS = ['Dmax-Dmin', 'Decibels'];

@Component({
  selector: 'app-measure-chart',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, FormsModule],
  templateUrl: './measure-chart.html',
  styleUrl: './measure-chart.scss',
})
export class MeasureChart {
  private chartService = inject(ChartService);
  private router = inject(Router);

  chartTypes = Object.values(ChartType);

  selectedChart = signal<ChartType | null>(null);
  layers = signal<EditableLayer[]>([]);
  finalLayer = signal<EditableLayer | null>(null);

  // New — top-level metadata the API requires but the grid alone
  // doesn't capture. Plain component properties (not signals) since
  // they're simple two-way ngModel bindings, same pattern as the
  // login/register forms.
  filmType = '';

  saving = signal(false);
  saveError = signal<string | null>(null);

  // New — last few charts of the currently selected type, shown as a
  // quick reference so measurements stay consistently named/ordered.
  recentCharts = signal<ChartResponse[]>([]);
  loadingRecent = signal(false);

  totalRows = computed(() => {
    const type = this.selectedChart();
    if (!type) return 0;
    return CHART_PRESETS[type].finalLayerRowCount - 1;
  });

  rowIndexes = computed(() =>
    Array.from({ length: this.totalRows() }, (_, i) => i)
  );

  isComputedFinal = computed(() => this.layers().length > 0);

  private summedValues = computed<(number | null)[]>(() => {
    const layers = this.layers();
    const totalRows = this.totalRows();
    const sums: (number | null)[] = Array(totalRows).fill(null);

    for (let row = 0; row < totalRows; row++) {
      let sum = 0;
      let hasValue = false;
      for (const layer of layers) {
        const v = layer.values[row];
        if (v !== null && v !== undefined) {
          sum += v;
          hasValue = true;
        }
      }
      sums[row] = hasValue ? sum : null;
    }
    return sums;
  });

  finalValues = computed<(number | null)[]>(() => {
    if (!this.isComputedFinal()) {
      return this.finalLayer()?.values ?? [];
    }

    const totalRows = this.totalRows();
    const sums = [...this.summedValues()];

    if (totalRows < 2) return sums;

    const realRows = sums.slice(0, totalRows - 2).filter(
      (v): v is number => v !== null
    );

    if (realRows.length === 0) return sums;

    const dMax = Math.max(...realRows);
    const dMin = Math.min(...realRows);
    const dRange = dMax - dMin;

    sums[totalRows - 2] = dRange;
    sums[totalRows - 1] = dRange * 20;

    return sums;
  });

   onChartSelect(value: ChartType): void {
    this.selectedChart.set(value);
    this.saveError.set(null);

    const preset = CHART_PRESETS[value];
    const totalRows = preset.finalLayerRowCount - 1;

    const newLayers: EditableLayer[] = preset.layerRowCounts.map((rowCount, idx) => {
      const valueCount = rowCount - 1;
      const activeStart = idx === 0 ? 0 : totalRows - valueCount;
      const activeEnd = activeStart + valueCount;

      return {
        name: '',
        values: Array(totalRows).fill(null),
        activeStart,
        activeEnd
      };
    });

    this.layers.set(newLayers);
    this.finalLayer.set({
      name: '',
      values: Array(totalRows).fill(null),
      activeStart: 0,
      activeEnd: totalRows
    });

    this.loadRecentCharts(value);
  }

  
  /**
   * Fetches all charts of this type and keeps just the most recent 3
   * (list order reflects insertion order, since we don't currently
   * sort or paginate on the backend — good enough for a "what did I
   * name things last time" reference, but not a guaranteed ordering
   * if the backend ever adds sorting/filtering later).
   */
  loadRecentCharts(type: ChartType): void {
    this.loadingRecent.set(true);
    this.chartService.listCharts(type).subscribe({
      next: (charts) => {
        this.recentCharts.set(charts.slice(-3).reverse());
        this.loadingRecent.set(false);
      },
      error: () => {
        this.recentCharts.set([]);
        this.loadingRecent.set(false);
      }
    });
  }

  isActive(layer: EditableLayer, row: number): boolean {
    return row >= layer.activeStart && row < layer.activeEnd;
  }

  trailingLabel(layerIndex: number, layer: EditableLayer, row: number): string | null {
    if (layerIndex !== 0) return null;
    const offset = row - layer.activeEnd;
    if (offset < 0 || offset >= TRAILING_LABELS.length) return null;
    return TRAILING_LABELS[offset];
  }

  layerPlaceholder(index: number): string {
    return `Layer name ${index + 1}`;
  }

  updateLayerName(layerIndex: number, name: string): void {
    this.layers.update(layers => {
      const copy = [...layers];
      copy[layerIndex] = { ...copy[layerIndex], name };
      return copy;
    });
  }

  updateLayerValue(layerIndex: number, row: number, rawValue: string): void {
    this.layers.update(layers => {
      const copy = [...layers];
      const values = [...copy[layerIndex].values];
      values[row] = rawValue === '' ? null : Number(rawValue);
      copy[layerIndex] = { ...copy[layerIndex], values };
      return copy;
    });
  }

  updateFinalLayerName(name: string): void {
    this.finalLayer.update(fl => fl ? { ...fl, name } : fl);
  }

  updateFinalLayerValue(row: number, rawValue: string): void {
    this.finalLayer.update(fl => {
      if (!fl) return fl;
      const values = [...fl.values];
      values[row] = rawValue === '' ? null : Number(rawValue);
      return { ...fl, values };
    });
  }

  onEnterKey(event: Event, colId: string, row: number): void {
    event.preventDefault();
    const nextInput = document.getElementById(`cell-${colId}-${row + 1}`);
    if (nextInput) {
      (nextInput as HTMLInputElement).focus();
    }
  }

  /**
   * Assembles everything currently on screen into a ChartCreate and
   * POSTs it. Empty cells (null) are sent as 0 — this matches the
   * placeholder "0" hint shown in each cell, so an untouched cell and
   * an explicitly-zeroed cell are treated the same way. If that's not
   * the right assumption for real measurement data, this is the one
   * spot to change (e.g. block save instead, if any active cell is
   * still null).
   */
  saveChart(): void {
  const type = this.selectedChart();
  if (!type) {
    this.saveError.set('Pick a chart type first.');
    return;
  }

  const finalLayerName = this.finalLayer()?.name?.trim();

  if (!finalLayerName) {
    this.saveError.set('Final layer name is required (this is used as the chart name).');
    return;
  }
  if (!this.filmType.trim()) {
    this.saveError.set('Film type is required.');
    return;
  }

  this.saveError.set(null);
  this.saving.set(true);

  const layersPayload = this.layers().map(layer => ({
    name: layer.name,
    values: layer.values.slice(layer.activeStart, layer.activeEnd)
      .map(v => v ?? 0)
  }));

  const finalLayerPayload = {
    name: finalLayerName,
    values: this.finalValues().map(v => v ?? 0)
  };

  this.chartService.createChart({
    chart_type: type,
    name: finalLayerName,   // chart's top-level name = final layer's name
    film_type: this.filmType,
    layers: layersPayload,
    final_layer: finalLayerPayload
  }).subscribe({
    next: () => {
      this.saving.set(false);
      this.router.navigate(['/charts']);
    },
    error: (err) => {
      this.saving.set(false);
      this.saveError.set(err?.error?.detail ?? 'Failed to save chart.');
    }
  });
}
}
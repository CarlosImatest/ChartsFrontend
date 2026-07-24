import { Component, signal, computed } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ChartType } from '../../shared/models/chart.model';
import { CHART_PRESETS } from '../../shared/models/chart-preset.model';

interface EditableLayer {
  name: string;
  values: (number | null)[];
  activeStart: number;
  activeEnd: number; // exclusive
}

const TRAILING_LABELS = ['Dmax-Dmin', 'Decibels'];

@Component({
  selector: 'app-measure-chart',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './measure-chart.html',
  styleUrl: './measure-chart.scss',
})
export class MeasureChart {
  chartTypes = Object.values(ChartType);

  selectedChart = signal<ChartType | null>(null);
  layers = signal<EditableLayer[]>([]);
  finalLayer = signal<EditableLayer | null>(null);

  totalRows = computed(() => {
    const type = this.selectedChart();
    if (!type) return 0;
    return CHART_PRESETS[type].finalLayerRowCount - 1;
  });

  rowIndexes = computed(() =>
    Array.from({ length: this.totalRows() }, (_, i) => i)
  );

  isComputedFinal = computed(() => this.layers().length > 0);

  // Row-wise sums (raw, before the last-two-rows override)
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
  //gives an id based on its col and row so when ENTER it looks for the id
  //and moves to the next cell/row
  onEnterKey(event: Event, colId: string, row: number): void {
  event.preventDefault();
  const nextInput = document.getElementById(`cell-${colId}-${row + 1}`);
  if (nextInput) {
    (nextInput as HTMLInputElement).focus();
  }
}
}
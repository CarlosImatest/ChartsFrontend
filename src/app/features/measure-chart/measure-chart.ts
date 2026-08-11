import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChartService } from '../../core/services/chart.service';
import { ChartType, ChartResponse, Layer } from '../../shared/models/chart.model';
import { CHART_PRESETS } from '../../shared/models/chart-preset.model';

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
export class MeasureChart implements OnInit {
  private chartService = inject(ChartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  chartTypes = Object.values(ChartType);

  selectedChart = signal<ChartType | null>(null);
  layers = signal<EditableLayer[]>([]);
  finalLayer = signal<EditableLayer | null>(null);

  filmType = '';
  saving = signal(false);
  saveError = signal<string | null>(null);

  recentCharts = signal<ChartResponse[]>([]);
  loadingRecent = signal(false);

  // Edit-mode state — null means "creating new", set means "editing existing"
  editingChartId = signal<string | null>(null);
  loadingExisting = signal(false);

  isEditMode = computed(() => this.editingChartId() !== null);

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

  ngOnInit(): void {
    const chartType = this.route.snapshot.paramMap.get('chartType') as ChartType | null;
    const chartId = this.route.snapshot.paramMap.get('chartId');

    if (chartType && chartId) {
      this.loadExistingChart(chartType, chartId);
    }
  }

  /**
   * Edit mode entry point. Builds the same grid shape onChartSelect
   * would (via buildGridForType), then overwrites it with the
   * chart's real saved values instead of leaving cells blank.
   */
  private loadExistingChart(chartType: ChartType, chartId: string): void {
    this.loadingExisting.set(true);
    this.editingChartId.set(chartId);
    this.selectedChart.set(chartType);

    this.buildGridForType(chartType);
    this.loadRecentCharts(chartType);

    this.chartService.getChart(chartType, chartId).subscribe({
      next: (chart) => {
        this.filmType = chart.film_type;
        this.populateGridFromChart(chart);
        this.loadingExisting.set(false);
      },
      error: () => {
        this.saveError.set('Failed to load chart for editing.');
        this.loadingExisting.set(false);
      }
    });
  }

  /**
   * Fills the already-shaped grid (built by buildGridForType) with
   * real saved values. Each real layer's values are shorter than the
   * grid's total rows (grid is padded to align columns) — we place
   * them back at the same activeStart/activeEnd offset the grid
   * already computed, so a layer-2-style bottom-aligned column lands
   * in the right rows rather than at the top.
   */
  private populateGridFromChart(chart: ChartResponse): void {
    this.layers.update(gridLayers =>
      gridLayers.map((gridLayer, idx) => {
        const savedLayer: Layer | undefined = chart.layers[idx];
        if (!savedLayer) return gridLayer;

        const values = [...gridLayer.values];
        savedLayer.values.forEach((v, i) => {
          values[gridLayer.activeStart + i] = v;
        });

        return { ...gridLayer, name: savedLayer.name, values };
      })
    );

    this.finalLayer.update(fl => {
      if (!fl) return fl;
      return {
        ...fl,
        name: chart.final_layer.name,
        values: [...chart.final_layer.values]
      };
    });
  }

  /** Shared grid-shaping logic — used by both onChartSelect (new chart)
   *  and loadExistingChart (edit mode), so the two stay in sync. */
  private buildGridForType(type: ChartType): void {
    const preset = CHART_PRESETS[type];
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

  onChartSelect(value: ChartType): void {
    // Chart type shouldn't change mid-edit — this handler only fires
    // from the dropdown, which is hidden entirely in edit mode (see
    // template), so this guard is a belt-and-suspenders safety net.
    if (this.isEditMode()) return;

    this.selectedChart.set(value);
    this.saveError.set(null);
    this.buildGridForType(value);
    this.loadRecentCharts(value);
  }

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

    const chartId = this.editingChartId();

    if (chartId) {
      // Edit mode — PATCH the existing chart.
      this.chartService.updateChart(type, chartId, {
        name: finalLayerName,
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
          this.saveError.set(err?.error?.detail ?? 'Failed to update chart.');
        }
      });
    } else {
      // Create mode — POST a new chart.
      this.chartService.createChart({
        chart_type: type,
        name: finalLayerName,
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
}
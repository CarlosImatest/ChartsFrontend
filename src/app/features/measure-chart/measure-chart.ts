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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface EditableLayer {
  name: string;
  values: (number | null)[];
  activeStart: number;
  activeEnd: number;
}

interface ActiveCell {
  colId: string;
  row: number;
}

const TRAILING_LABELS = ['Dmax-Dmin', 'Decibels'];

// Value range for flagging out-of-range measurements
const VALUE_RANGE = { min: 1, max: 5 };

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

  editingChartId = signal<string | null>(null);
  loadingExisting = signal(false);
  isEditMode = computed(() => this.editingChartId() !== null);

  /** Currently focused cell — drives the highlight styling in the template. */
  activeCell = signal<ActiveCell | null>(null);

  totalRows = computed(() => {
    const type = this.selectedChart();
    if (!type) return 0;
    return CHART_PRESETS[type].finalLayerRowCount - 1;
  });

  rowIndexes = computed(() =>
    Array.from({ length: this.totalRows() }, (_, i) => i)
  );

  isComputedFinal = computed(() => this.layers().length > 0);

  /**
   * Ordered list of column ids that actually contain an <input> —
   * used to drive left/right arrow navigation. Layer columns are
   * always navigable; the final column only is when it's directly
   * editable (LDR-style charts with no other layers).
   */
  navigableColumns = computed<string[]>(() => {
    const layerIds = this.layers().map((_, i) => `layer-${i}`);
    return this.isComputedFinal() ? layerIds : [...layerIds, 'final'];
  });

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
    if (this.isEditMode()) return;

    this.selectedChart.set(value);
    this.saveError.set(null);
    this.activeCell.set(null);
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

  // ---- Cell selection / navigation ----

  setActiveCell(colId: string, row: number): void {
    this.activeCell.set({ colId, row });
  }

  isActiveCell(colId: string, row: number): boolean {
    const active = this.activeCell();
    return !!active && active.colId === colId && active.row === row;
  }

  /** True if the given column/row actually has an editable input at all
   *  (i.e. isn't a padded/inactive cell). Used by navigation to skip
   *  over blank space rather than trying to focus a non-input cell. */
  private isCellEditable(colId: string, row: number): boolean {
    if (colId === 'final') {
      return !this.isComputedFinal();
    }
    const idx = Number(colId.replace('layer-', ''));
    const layer = this.layers()[idx];
    return !!layer && this.isActive(layer, row);
  }

  private focusCell(colId: string, row: number): void {
    const el = document.getElementById(`cell-${colId}-${row}`);

    if (el instanceof HTMLInputElement) {
      el.focus();

      // Highlight the entire value
      el.select();
    }
  }

  private moveVertical(colId: string, row: number, direction: 1 | -1): void {
    const totalRows = this.totalRows();
    let r = row + direction;

    while (r >= 0 && r < totalRows) {
      if (this.isCellEditable(colId, r)) {
        this.focusCell(colId, r);
        return;
      }
      r += direction;
    }
    // Reached the top/bottom of this column — nothing to do, stay put.
  }

  private moveHorizontal(colId: string, row: number, direction: 1 | -1): void {
    const columns = this.navigableColumns();
    let i = columns.indexOf(colId) + direction;

    while (i >= 0 && i < columns.length) {
      if (this.isCellEditable(columns[i], row)) {
        this.focusCell(columns[i], row);
        return;
      }
      i += direction;
    }
  }

  onCellKeydown(event: KeyboardEvent, colId: string, row: number): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
        event.preventDefault();
        this.moveVertical(colId, row, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveVertical(colId, row, -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveHorizontal(colId, row, 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveHorizontal(colId, row, -1);
        break;
      // Any other key (typing digits, Tab, etc.) falls through to
      // default browser/input behavior untouched.
    }
  }

  // ---- Save ----

  /**
   * Validates all required fields are filled before even attempting a
   * duplicate check or save. Returns a user-facing error string, or
   * null if everything's valid.
   */
  private validateRequiredFields(): string | null {
    const finalLayerName = this.finalLayer()?.name?.trim();

    if (!finalLayerName) {
      return 'Final layer name is required (this is used as the chart name).';
    }
    if (!this.filmType.trim()) {
      return 'Film type is required.';
    }

    const unnamed = this.layers().findIndex(l => !l.name.trim());
    if (unnamed !== -1) {
      return `Layer ${unnamed + 1} name is required.`;
    }

    return null;
  }

  /**
   * Checks the current chart's name (= final layer name) and every
   * layer name against what's already saved for this chart type.
   * When editing an existing chart, that chart's own record is
   * excluded from the comparison — otherwise editing a chart without
   * renaming anything would always "collide" with itself.
   */
  private checkDuplicate(type: ChartType): Observable<string | null> {
    return this.chartService.listCharts(type).pipe(
      map((charts) => {
        const currentId = this.editingChartId();
        const others = charts.filter(c => c.id !== currentId);

        const finalLayerName = this.finalLayer()?.name?.trim() ?? '';
        const enteredLayerNames = this.layers().map(l => l.name.trim());

        const nameCollision = others.some(c => c.name === finalLayerName);
        if (nameCollision) {
          return `A chart named "${finalLayerName}" already exists for ${type}.`;
        }

        for (const layerName of enteredLayerNames) {
          const layerCollision = others.some(c =>
            c.layers.some(l => l.name === layerName) || c.final_layer.name === layerName
          );
          if (layerCollision) {
            return `Layer name "${layerName}" is already used in another ${type} chart.`;
          }
        }

        return null;
      })
    );
  }

  saveChart(): void {
    const type = this.selectedChart();
    if (!type) {
      this.saveError.set('Pick a chart type first.');
      return;
    }

    const fieldError = this.validateRequiredFields();
    if (fieldError) {
      this.saveError.set(fieldError);
      return;
    }

    this.saveError.set(null);
    this.saving.set(true);

    this.checkDuplicate(type).subscribe({
      next: (duplicateError) => {
        if (duplicateError) {
          this.saving.set(false);
          this.saveError.set(duplicateError);
          return;
        }
        this.performSave(type);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to check for duplicate charts.');
      }
    });
  }

  /** The actual create/update call — only reached once all validation passes. */
  private performSave(type: ChartType): void {
    const finalLayerName = this.finalLayer()!.name.trim();

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

  /**
   * True if the value is a real number outside the acceptable range.
   * null/undefined (empty cells) are never flagged — an empty cell
   * isn't "wrong," it's just not filled in yet.
   */
  isOutOfRange(value: number | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    return value < VALUE_RANGE.min || value > VALUE_RANGE.max;
  }
}
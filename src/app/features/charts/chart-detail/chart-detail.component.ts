import { Component, inject, signal, OnInit, computed } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';

const TRAILING_LABELS = ['Dmax-Dmin', 'Decibels'];


@Component({
  selector: 'app-chart-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chart-detail.component.html',
  styleUrl: './chart-detail.component.scss',
})
export class ChartDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private chartService = inject(ChartService);

  chart = signal<ChartResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  // 1. Create a combined list of all layers so your HTML headers loop through them perfectly
  // allLayers now returns a lightweight {name: string}[] rather than
  // full Layer objects, since the template only ever reads .name for
  // headers — this lets LDR synthesize a blank label-column header
  // without needing a fake Layer object with dummy values/etc.
  allLayers = computed<{ name: string }[]>(() => {
    const c = this.chart();
    if (!c) return [];

    if (c.layers.length === 0) {
      // LDR-style: no real layer1, so we add a blank-named pseudo
      // column purely to hold the Dmax-Dmin/Decibels labels, alongside
      // the real final layer column.
      return [{ name: '' }, c.final_layer];
    }

    return [...c.layers, c.final_layer];
  });
  //getting the chart type name to be display in html
  chartType = this.route.snapshot.paramMap.get('chartType') as ChartType;

  // 2. Pivot the data into rows, adding top-offset padding to the middle layers
  // Pivot the data into rows, adding top-offset padding to the middle layers
  tableRows = computed(() => {
    const c = this.chart();
    if (!c || !c.final_layer) return [];

    const middleLayers = c.layers.slice(1);
    const finalLayer = c.final_layer;
    const layer1 = c.layers[0];

    if (!layer1) {
      // LDR: synthesize a label column alongside the real final-layer
      // values. Labels go in the last two rows, same convention as
      // every other chart type's trailing rows.
      const totalRows = finalLayer.values.length;
      const trailingCount = Math.min(TRAILING_LABELS.length, totalRows);

      const rows: (string | number)[][] = [];
      for (let i = 0; i < totalRows; i++) {
        const offsetFromEnd = totalRows - i;
        const label = offsetFromEnd <= trailingCount
          ? TRAILING_LABELS[trailingCount - offsetFromEnd]
          : '';
        rows.push([label, finalLayer.values[i]]);
      }
      return rows;
    }

    const layer1Length = layer1.values.length;
    const columns: (string | number)[][] = [];

    const layer1Column: (string | number)[] = [...layer1.values];
    const trailingCount = finalLayer.values.length - layer1Length;
    for (let i = 0; i < Math.min(trailingCount, TRAILING_LABELS.length); i++) {
      layer1Column.push(TRAILING_LABELS[i]);
    }
    columns.push(layer1Column);

    middleLayers.forEach(layer => {
      const diff = layer1Length - layer.values.length;
      if (diff > 0) {
        const paddedValues = [...Array(diff).fill(''), ...layer.values];
        columns.push(paddedValues);
      } else {
        columns.push([...layer.values]);
      }
    });

    columns.push([...finalLayer.values]);

    const maxRows = Math.max(...columns.map(col => col.length), 0);

    const rows: (string | number)[][] = [];
    for (let i = 0; i < maxRows; i++) {
      const rowData = columns.map(col => col[i] !== undefined ? col[i] : '');
      rows.push(rowData);
    }
    return rows;
  });

  ngOnInit() {
    const chartType = this.route.snapshot.paramMap.get('chartType') as ChartType;
    const chartId = this.route.snapshot.paramMap.get('chartId')!;

    this.chartService.getChart(chartType, chartId).subscribe({
      next: (chart) => {
        this.chart.set(chart);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load chart', err);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }
}
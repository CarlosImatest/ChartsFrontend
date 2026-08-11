import { Component, inject, signal, OnInit, computed } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';

@Component({
  selector: 'app-chart-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chart-detail.component.html',
})
export class ChartDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private chartService = inject(ChartService);

  chart = signal<ChartResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  // 1. Create a combined list of all layers so your HTML headers loop through them perfectly
  allLayers = computed(() => {
    const c = this.chart();
    if (!c) return [];
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

  // LDR-style charts have no regular layers at all — final_layer is
  // the only column that exists. Build rows directly from it instead.
  if (!layer1) {
    return finalLayer.values.map(v => [v]);
  }

  const layer1Length = layer1.values.length;
  const columns: (string | number)[][] = [];

  columns.push([...layer1.values]);

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
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';

@Component({
  selector: 'app-chart-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chart-detail.component.html'
})
export class ChartDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private chartService = inject(ChartService);

  chart = signal<ChartResponse | null>(null);
  loading = signal(true);
  error = signal(false);

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
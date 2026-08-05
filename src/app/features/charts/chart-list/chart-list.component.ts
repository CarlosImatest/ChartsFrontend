import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';
import { layerToCsv, sanitizeFilename, downloadCsv } from '../../../shared/utils/csv.util';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/models/user.model';

@Component({
  selector: 'app-chart-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSelectModule, MatFormFieldModule, MatButtonModule, RouterLink],
  templateUrl: './chart-list.component.html'
})
export class ChartListComponent implements OnInit {
  private chartService = inject(ChartService);
  authService = inject(AuthService);  // public — template needs to read it
  UserRole = UserRole;               // expose enum to the template


  chartTypes = Object.values(ChartType);
  selectedType = signal<ChartType>(ChartType.CRC);
  charts = signal<ChartResponse[]>([]);
  displayedColumns = ['name', 'film_type', 'actions'];

  ngOnInit() {
    this.loadCharts();
  }

  onTypeChange(type: ChartType) {
    this.selectedType.set(type);
    this.loadCharts();
  }

  loadCharts() {
    this.chartService.listCharts(this.selectedType()).subscribe({
      next: (charts) => this.charts.set(charts),
      error: (err) => console.error('Failed to load charts', err)
    });
  }

  /**
   * Downloads only the final layer, as CSV, named after the final
   * layer's own name (not the chart's name) — per what was asked for.
   * Uses the ChartResponse already sitting in `charts()` — no extra
   * API call, since list responses already include final_layer in full.
   */
  downloadChart(chart: ChartResponse): void {
    const csv = layerToCsv(chart.final_layer);
    const filename = `${sanitizeFilename(chart.final_layer.name)}.csv`;
    downloadCsv(filename, csv);
  }
}
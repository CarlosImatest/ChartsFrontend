import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';
import { UserRole } from '../../../shared/models/user.model';
import { layerToCsv, sanitizeFilename, downloadCsv } from '../../../shared/utils/csv.util';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-chart-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatInputModule, RouterLink],
  templateUrl: './chart-list.component.html',
  styleUrl: './chart-list.component.scss'
})
export class ChartListComponent implements OnInit {
  private chartService = inject(ChartService);
  private router = inject(Router);
  authService = inject(AuthService);
  UserRole = UserRole;

  chartTypes = Object.values(ChartType);
  selectedType = signal<ChartType>(ChartType.CRC);
  charts = signal<ChartResponse[]>([]);
  displayedColumns = ['name', 'film_type', 'actions'];

  deletingId = signal<string | null>(null);

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

  downloadChart(chart: ChartResponse): void {
    const csv = layerToCsv(chart.final_layer, this.selectedType());
    const filename = `${sanitizeFilename(chart.final_layer.name)}.csv`;
    downloadCsv(filename, csv);
  }

  /**
   * Navigates to Measure Chart in edit mode. The chart type + id go
   * in the URL as route params (see app.routes.ts), which
   * measure-chart.ts reads on init to know it should load + PATCH
   * instead of starting blank + POST.
   */
  editChart(chart: ChartResponse): void {
    this.router.navigate(['/measure-chart', this.selectedType(), chart.id]);
  }

  /**
   * Simple native confirm() dialog — not a styled Material dialog,
   * to keep this straightforward. Swap for MatDialog later if you
   * want a nicer-looking confirmation.
   */
  deleteChart(chart: ChartResponse): void {
    const confirmed = confirm(`Delete "${chart.name}"? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingId.set(chart.id);

    this.chartService.deleteChart(this.selectedType(), chart.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.charts.update(list => list.filter(c => c.id !== chart.id));
      },
      error: (err) => {
        this.deletingId.set(null);
        alert(err?.error?.detail ?? 'Failed to delete chart.');
      }
    });
  }
  
  searchTerm = signal('');

  /**
   * Client-side filter over whatever's already loaded for the
   * selected chart type. Case-insensitive substring match, same
   * semantics as the backend's search_charts, so behavior stays
   * consistent if this ever moves server-side later.
   */
  filteredCharts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.charts();
    return this.charts().filter(c => c.name.toLowerCase().includes(term));
  });
  
}
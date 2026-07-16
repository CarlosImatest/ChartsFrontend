import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';
import { ChartService } from '../../../core/services/chart.service';
import { ChartResponse, ChartType } from '../../../shared/models/chart.model';

@Component({
  selector: 'app-chart-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSelectModule, MatFormFieldModule, RouterLink],
  templateUrl: './chart-list.component.html'
})
export class ChartListComponent implements OnInit {
  private chartService = inject(ChartService);

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
}
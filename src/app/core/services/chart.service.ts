import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChartCreate, ChartResponse, ChartType } from '../../shared/models/chart.model';

/** Partial update — same shape as backend's ChartUpdate, all fields optional. */
export interface ChartUpdatePayload {
  name?: string;
  film_type?: string;
  layers?: { name: string; values: number[] }[];
  final_layer?: { name: string; values: number[] };
}

@Injectable({ providedIn: 'root' })
export class ChartService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/charts`;

  createChart(chart: ChartCreate): Observable<ChartResponse> {
    return this.http.post<ChartResponse>(this.baseUrl, chart);
  }

  getChart(chartType: ChartType, chartId: string): Observable<ChartResponse> {
    return this.http.get<ChartResponse>(`${this.baseUrl}/${chartType}/${chartId}`);
  }

  listCharts(chartType: ChartType): Observable<ChartResponse[]> {
    return this.http.get<ChartResponse[]>(`${this.baseUrl}/${chartType}`);
  }

  updateChart(chartType: ChartType, chartId: string, update: ChartUpdatePayload): Observable<ChartResponse> {
    return this.http.patch<ChartResponse>(`${this.baseUrl}/${chartType}/${chartId}`, update);
  }

  deleteChart(chartType: ChartType, chartId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${chartType}/${chartId}`);
  }
}
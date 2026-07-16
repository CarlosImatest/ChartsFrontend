import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChartCreate, ChartResponse, ChartType } from '../../shared/models/chart.model';

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
}
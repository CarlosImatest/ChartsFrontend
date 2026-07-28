import { Routes } from '@angular/router';


export const CHARTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./chart-list/chart-list.component').then(m => m.ChartListComponent)
  },
  {
    path: ':chartType/:chartId',
    loadComponent: () =>
      import('./chart-detail/chart-detail.component').then(m => m.ChartDetailComponent)
  },
];
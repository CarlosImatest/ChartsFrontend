import { Routes } from '@angular/router';
import { TableDemoComponent } from '../../app.component'; // Adjust path if needed

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

  {
    path: 'demo', // <-- Give it a clear path here!
    loadComponent: () =>
      import('../../app.component').then(m => m.TableDemoComponent)
  }
];
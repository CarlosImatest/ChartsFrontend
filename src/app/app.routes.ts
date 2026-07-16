import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'charts', pathMatch: 'full' },
  {
    path: 'charts',
    loadChildren: () => import('./features/charts/charts.routes').then(m => m.CHARTS_ROUTES)
  }
];
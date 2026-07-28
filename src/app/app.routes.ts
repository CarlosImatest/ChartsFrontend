import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './shared/models/user.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then(m => m.Home)
  },
  {
    path: 'register',
    canActivate: [roleGuard(UserRole.ADMIN)],
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },
  {
    path: 'charts',
    canActivate: [authGuard],
    loadChildren: () => import('./features/charts/charts.routes').then(m => m.CHARTS_ROUTES)
  },
  {
    path: 'measure-chart',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/measure-chart/measure-chart').then(m => m.MeasureChart)
  }
];
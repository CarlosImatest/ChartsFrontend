import { Routes } from '@angular/router';
import { authGuard, roleGuard, pendingGuard } from './core/guards/auth.guard';
import { UserRole } from './shared/models/user.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    // Public — no guard. Anyone with a valid invite link lands here,
    // logged out, to create their account.
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then(m => m.Signup)
  },
  {
    path: 'waiting',
    canActivate: [pendingGuard],
    loadComponent: () => import('./features/auth/waiting/waiting').then(m => m.Waiting)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then(m => m.Home)
  },
  {
    // Admin-direct "add user" form (bypasses invite/verification).
    path: 'register',
    canActivate: [roleGuard(UserRole.ADMIN)],
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },
  {
    // Generates invite links — separate from 'register' above.
    path: 'invite',
    canActivate: [roleGuard(UserRole.ADMIN)],
    loadComponent: () => import('./features/auth/invite/invite').then(m => m.Invite)
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
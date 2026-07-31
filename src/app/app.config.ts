import { ApplicationConfig, provideZonelessChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Runs once on app startup, before routing kicks in. If a token is
    // already saved (e.g. from a previous session), we ask the backend
    // "who is this?" via GET /auth/me and populate currentUser. This is
    // what lets a page refresh keep you logged in instead of bouncing
    // you to /login even though your token is still valid.
    provideAppInitializer(() => {
      const authService = inject(AuthService);

      if (!authService.getToken()) {
        return Promise.resolve();
      }

      return firstValueFrom(
        authService.loadCurrentUser().pipe(
          catchError(() => {
            // Token exists but is invalid/expired — clear it so the
            // user isn't stuck in a broken "half logged in" state.
            authService.logout();
            return of(null);
          })
        )
      ).then((user) => {
        if (user) {
          authService.currentUser.set(user);
        }
      });
    })
  ]
};
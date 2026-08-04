import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/models/user.model';

/**
 * Base gate: must be logged in AND fully active (verified). A pending
 * user hitting a normal route gets redirected to /waiting instead of
 * being let through — this is what "locks" pending users to just the
 * waiting page, as opposed to authGuard only checking isLoggedIn.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isPending()) {
    router.navigate(['/waiting']);
    return false;
  }

  return true;
};

export function roleGuard(minimum: UserRole): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // roleGuard implies authGuard's checks too — an unverified user
    // shouldn't reach a role check at all.
    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }
    if (authService.isPending()) {
      router.navigate(['/waiting']);
      return false;
    }
    if (!authService.hasMinimumRole(minimum)) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
}

/**
 * The inverse of authGuard's pending check — guards the /waiting route
 * itself. Must be logged in (otherwise nothing to wait for → /login),
 * but must NOT already be active (otherwise they don't belong here
 * anymore → send them home instead of showing a stale waiting screen).
 */
export const pendingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isActive()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse, UserResponse, UserRole } from '../../shared/models/user.model';

const TOKEN_KEY = 'auth_token';

/**
 * Maps each role to a numeric rank so we can do "at least editor"
 * style checks with a simple >= comparison, instead of checking
 * each role name individually. Mirrors ROLE_RANK on the backend
 * (app/core/security.py) — keep both in sync if roles ever change.
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.VIEWER]: 0,
  [UserRole.EDITOR]: 1,
  [UserRole.ADMIN]: 2,
};

/**
 * Owns everything related to "who is currently logged in":
 * - Making the login request
 * - Persisting/reading the JWT from localStorage
 * - Holding the current user in a signal so any component/guard
 *   can reactively read `currentUser()` or `isLoggedIn()`
 * - Role-based access checks (`hasMinimumRole`)
 *
 * Does NOT own user creation/management — that's a separate concern
 * handled directly by the register component for now.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  /** The logged-in user, or null if nobody is logged in. */
  currentUser = signal<UserResponse | null>(null);

  /** Derived convenience signal — true whenever currentUser is set. */
  isLoggedIn = computed(() => this.currentUser() !== null);

  /**
   * Sends credentials to POST /auth/login. Does NOT store anything
   * itself — the caller decides what to do with success/failure
   * (see handleLoginSuccess below, called explicitly on success).
   */
  login(credentials: LoginRequest) {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credentials);
  }

  /**
   * Called after a successful login response. Persists the JWT so it
   * survives page refreshes, and updates currentUser so the UI reacts
   * immediately (e.g. nav links, guards) without needing a reload.
   */
  handleLoginSuccess(response: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, response.access_token);
    this.currentUser.set(response.user);
  }

  /** Clears the session and sends the user back to the login page. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Asks the backend "who does this token belong to?" via GET /auth/me.
   * Used on app startup (see app.config.ts) to restore currentUser
   * after a refresh, without requiring the user to log in again.
   */
  loadCurrentUser() {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`);
  }

  /** True if the logged-in user's role is at or above `minimum`. */
  hasMinimumRole(minimum: UserRole): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
  }
}
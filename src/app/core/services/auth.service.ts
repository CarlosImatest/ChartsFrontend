import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse, UserResponse, UserRole } from '../../shared/models/user.model';

const TOKEN_KEY = 'auth_token';

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.VIEWER]: 0,
  [UserRole.EDITOR]: 1,
  [UserRole.ADMIN]: 2,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<UserResponse | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);

  login(credentials: LoginRequest) {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credentials);
  }

  handleLoginSuccess(response: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, response.access_token);
    this.currentUser.set(response.user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  loadCurrentUser() {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`);
  }

  hasMinimumRole(minimum: UserRole): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
  }
}
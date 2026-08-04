import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { InviteCreate, InviteResponse } from '../../shared/models/invite.model';

/**
 * Handles invite creation only. Redeeming an invite (the public signup
 * flow) lives in AuthService instead, since it results in a login —
 * this split mirrors the backend's InviteService (admin-only creation)
 * vs AuthService.register_with_invite (public redemption).
 */
@Injectable({ providedIn: 'root' })
export class InviteService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/invites`;

  createInvite(payload: InviteCreate) {
    return this.http.post<InviteResponse>(this.baseUrl, payload);
  }
}
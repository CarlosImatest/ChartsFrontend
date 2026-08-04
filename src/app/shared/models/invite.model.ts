import { UserRole } from './user.model';

export interface InviteCreate {
  email: string;
  role: UserRole;
}

export interface InviteResponse {
  token: string;
  email: string;
  role: UserRole;
  invite_url: string;
  expires_at: string;
}
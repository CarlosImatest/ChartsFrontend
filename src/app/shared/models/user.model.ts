export enum UserRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

/**
 * Mirrors app/common/enums.py UserStatus on the backend. PENDING_VERIFICATION
 * users exist and can log in, but should be locked to the waiting page
 * until they verify their email — see pendingGuard in auth.guard.ts.
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
}

export interface UserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

/** Sent by the public signup form — role/email are NOT included here
 *  because both are fixed server-side by the invite itself, matching
 *  RegisterWithInviteRequest on the backend. */
export interface RegisterWithInviteRequest {
  invite_token: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface VerifyEmailRequest {
  code: string;
}
// src/app/services/auth/auth.types.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  roles: string[];
  company_id: string | null;
  branch_id: string | null;
  perms: string[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface JwtClaims {
  exp?: number;
  jti?: string;
  [key: string]: any;
}

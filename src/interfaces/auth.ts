export interface JiraLoginInput {
  email: string;
  jiraApiToken: string;
}

export interface LoginRequestBody {
  email?: string;
  jiraApiToken?: string;
}

export interface LoginResult {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
}

export interface AuthenticatedUser {
  email: string;
  jiraApiToken: string;
}

export interface AuthTokenPayload {
  email: string;
  jiraApiToken: string;
  [key: string]: unknown;
}

export interface EncryptJWTLike {
  setProtectedHeader(header: Record<string, unknown>): EncryptJWTLike;
  setIssuedAt(issuedAt: number): EncryptJWTLike;
  setNotBefore(notBefore: number): EncryptJWTLike;
  setExpirationTime(exp: number): EncryptJWTLike;
  setJti(jti: string): EncryptJWTLike;
  encrypt(key: Uint8Array): Promise<string>;
}

export interface JoseModuleContract {
  EncryptJWT: new (payload: Record<string, unknown>) => EncryptJWTLike;
  jwtDecrypt(
    token: string,
    key: Uint8Array,
    options?: { clockTolerance?: number }
  ): Promise<{ payload: Record<string, unknown> }>;
}

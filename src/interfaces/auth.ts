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

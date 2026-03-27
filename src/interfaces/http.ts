export interface HttpErrorOptions {
  code?: string;
  details?: unknown;
}

export interface HttpErrorContract extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export interface ApiOverviewEntry {
  method: string;
  path: string;
  description: string;
}

export interface EndpointEntry {
  method: string;
  url: string;
}

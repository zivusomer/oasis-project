export interface CreateTicketRequestBody {
  projectKey?: string;
  title?: string;
  description?: string;
  issueType?: string;
}

export interface RecentTicketsQuery {
  projectKey?: string;
}

export interface JiraIssueCreateResponse {
  id?: string;
  key?: string;
  self?: string;
}

export interface JiraIssueSearchItem {
  id?: string;
  key?: string;
  self?: string;
  fields?: {
    summary?: string;
    created?: string;
    labels?: string[];
  };
}

export interface JiraIssueSearchResponse {
  issues?: JiraIssueSearchItem[];
}

export interface CreateTicketInput {
  authUser: import('./auth').AuthenticatedUser;
  projectKey: string;
  title: string;
  description: string;
  issueTypeName: string;
}

export interface CreateTicketResult {
  issueId?: string;
  issueKey: string;
  issueUrl: string;
  jiraSelfUrl?: string;
}

export interface RecentTicketsInput {
  authUser: import('./auth').AuthenticatedUser;
  projectKey: string;
}

export interface RecentTicketItem {
  issueId?: string;
  issueKey?: string;
  issueUrl?: string;
  summary?: string;
  createdAt?: string;
  jiraSelfUrl?: string;
}

export interface RecentTicketsResult {
  projectKey: string;
  count: number;
  issues: RecentTicketItem[];
}

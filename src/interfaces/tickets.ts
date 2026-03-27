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

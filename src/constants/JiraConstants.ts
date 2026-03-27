export class JiraConstants {
  public static readonly JIRA_BASE_URL_ENV = 'JIRA_BASE_URL';
  public static readonly JIRA_API_PATH_MYSELF = '/rest/api/3/myself';
  public static readonly JIRA_API_PATH_ISSUE = '/rest/api/3/issue';
  public static readonly JIRA_API_PATH_PROJECT = '/rest/api/3/project';
  public static readonly JIRA_API_PATH_SEARCH = '/rest/api/3/search/jql';
  public static readonly JIRA_LABEL_APP_CREATED = 'identityhub-finding';
  public static readonly JIRA_DEFAULT_ISSUE_TYPE = 'Task';
  public static readonly JIRA_MAX_RECENT_RESULTS = 10;
  public static readonly JIRA_RECENT_FIELDS = 'summary,created,labels';
}

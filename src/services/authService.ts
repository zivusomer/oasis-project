export type JiraLoginInput = {
  email: string;
  jiraApiToken: string;
};

export type LoginResult = {
  token: string;
};

export async function loginWithJira(_input: JiraLoginInput): Promise<LoginResult> {
  throw new Error('Not implemented yet');
}

import { useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function App() {
  const [email, setEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('KAN');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [recentTickets, setRecentTickets] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canCreate = useMemo(() => {
    return authToken && projectKey.trim() && title.trim() && description.trim();
  }, [authToken, projectKey, title, description]);

  async function login(event) {
    event.preventDefault();
    setLoggingIn(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          jiraApiToken: jiraApiToken.trim(),
        }),
      });
      const payload = await safeJson(response);
      if (!response.ok || !payload?.token) {
        throw new Error(extractError(payload, 'Login failed'));
      }
      setAuthToken(payload.token);
      setMessage('Login succeeded. Auth token set for next calls.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  }

  async function createTicket(event) {
    event.preventDefault();
    setSubmittingTicket(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectKey: projectKey.trim(),
          title: title.trim(),
          description: description.trim(),
        }),
      });
      const payload = await safeJson(response);
      if (!response.ok) {
        throw new Error(extractError(payload, 'Create ticket failed'));
      }
      setMessage(`Ticket created: ${payload.issueKey || 'unknown key'}`);
      await loadRecentTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create ticket failed');
    } finally {
      setSubmittingTicket(false);
    }
  }

  async function loadRecentTickets() {
    if (!authToken || !projectKey.trim()) {
      return;
    }

    setLoadingRecent(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/tickets/recent?projectKey=${encodeURIComponent(projectKey.trim())}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const payload = await safeJson(response);
      if (!response.ok) {
        throw new Error(extractError(payload, 'Load recent tickets failed'));
      }
      setRecentTickets(Array.isArray(payload.issues) ? payload.issues : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load recent tickets failed');
    } finally {
      setLoadingRecent(false);
    }
  }

  return (
    <div className="page">
      <h1>Oasis NHI Finding Ticket UI</h1>

      <section className="card">
        <h2>1) Connect Jira Account</h2>
        <form onSubmit={login} className="form">
          <label>
            Jira Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Jira API Token
            <input
              type="password"
              value={jiraApiToken}
              onChange={(event) => setJiraApiToken(event.target.value)}
              required
              placeholder="Atlassian API token"
            />
          </label>
          <button type="submit" disabled={loggingIn}>
            {loggingIn ? 'Logging in...' : 'POST /auth/login'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>2) Create NHI Finding Ticket</h2>
        <form onSubmit={createTicket} className="form">
          <label>
            Jira Project Key
            <input
              type="text"
              value={projectKey}
              onChange={(event) => setProjectKey(event.target.value)}
              required
              placeholder="KAN"
            />
          </label>
          <label>
            Title (summary)
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Stale Service Account: svc-deploy-prod"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              placeholder="Details about the finding"
              rows={5}
            />
          </label>
          <button type="submit" disabled={!canCreate || submittingTicket}>
            {submittingTicket ? 'Creating...' : 'POST /tickets'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>3) Recent Tickets (Top 10 from this app)</h2>
          <button type="button" onClick={loadRecentTickets} disabled={!authToken || loadingRecent}>
            {loadingRecent ? 'Loading...' : 'GET /tickets/recent'}
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <p className="muted">No tickets loaded yet.</p>
        ) : (
          <ul className="tickets">
            {recentTickets.map((ticket) => (
              <li key={ticket.issueKey || ticket.issueId}>
                <a href={ticket.issueUrl} target="_blank" rel="noreferrer">
                  {ticket.summary || ticket.issueKey}
                </a>
                <span>{formatDate(ticket.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractError(payload, fallbackMessage) {
  if (!payload || typeof payload !== 'object') return fallbackMessage;
  return payload.error || payload.message || fallbackMessage;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export default App;

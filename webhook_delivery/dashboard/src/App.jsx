import { useCallback, useEffect, useState } from 'react';

const REFRESH_MS = 3000;

export default function App() {
  const [webhooks, setWebhooks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/webhooks');
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = await response.json();
      setWebhooks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
    const interval = setInterval(loadWebhooks, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadWebhooks]);

  return (
    <div className="page">
      <header>
        <h1>Webhook Delivery Dashboard</h1>
        <p className="subtitle">Refreshes every {REFRESH_MS / 1000}s</p>
      </header>

      {loading && <p>Loading webhooks...</p>}
      {error && <p className="error">Could not load webhooks: {error}</p>}

      {!loading && !error && webhooks.length === 0 && (
        <p>No webhooks registered yet.</p>
      )}

      {webhooks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Event</th>
              <th>Method</th>
              <th>Hostname</th>
              <th>Path</th>
              <th>Last Success</th>
              <th>Successes</th>
              <th>Retries</th>
              <th>Errors</th>
              <th>Max Retries</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((webhook) => (
              <tr key={webhook.id}>
                <td>{webhook.id}</td>
                <td>{webhook.event}</td>
                <td>{webhook.method}</td>
                <td>{webhook.hostname}</td>
                <td>{webhook.path}</td>
                <td>{webhook.lastSuccess ?? '—'}</td>
                <td>{webhook.totalSuccesses}</td>
                <td>{webhook.totalRetries}</td>
                <td>{webhook.totalErrors}</td>
                <td>{webhook.maxRetries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

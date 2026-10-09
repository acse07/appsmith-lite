'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Play, Plus, Trash2, CheckCircle2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/ui/primitives';
import { queryConfigSchema, type QueryData, type SourceData } from '@/entities/ui-node/types';
export function QueryPanel({
  appId,
  workspaceId,
  queries,
  onChange,
}: {
  appId: string;
  workspaceId: string;
  queries: QueryData[];
  onChange: (queries: QueryData[]) => void;
}) {
  const [selected, setSelected] = useState(queries[0]?.id ?? 'new');
  const [name, setName] = useState('getData');
  const [sourceId, setSourceId] = useState('');
  const [method, setMethod] = useState('GET');
  const [resource, setResource] = useState('customers');
  const [headers, setHeaders] = useState('{}');
  const [params, setParams] = useState('{}');
  const [body, setBody] = useState('{}');
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(undefined);
  const [error, setError] = useState('');
  const sources = useQuery({
    queryKey: ['sources', workspaceId],
    queryFn: () => api<SourceData[]>(`/workspaces/${workspaceId}/sources`),
  });
  const source = sources.data?.find((s) => s.id === sourceId) ?? sources.data?.[0];
  useEffect(() => {
    const q = queries.find((q) => q.id === selected);
    setName(q?.name ?? 'getData');
    setSourceId(q?.sourceId ?? sources.data?.[0]?.id ?? '');
    setMethod(q?.config.method ?? 'GET');
    setResource(q?.config.resource ?? 'customers');
    setHeaders(JSON.stringify(q?.config.headers ?? {}, null, 2));
    setParams(JSON.stringify(q?.config.params ?? {}, null, 2));
    setBody(JSON.stringify(q?.config.body ?? {}, null, 2));
    setAuto(q?.config.runOnLoad ?? true);
    setResult(undefined);
    setError('');
  }, [selected, queries, sources.data]);
  async function save() {
    const config = queryConfigSchema.parse({
      method,
      resource,
      headers: JSON.parse(headers),
      params: JSON.parse(params),
      body: JSON.parse(body),
      runOnLoad: auto,
    });
    const q = await api<QueryData>(
      `/apps/${appId}/queries${selected === 'new' ? '' : `/${selected}`}`,
      selected === 'new' ? 'POST' : 'PATCH',
      { name, sourceId: source?.id, config },
    );
    onChange(
      selected === 'new' ? [...queries, q] : queries.map((old) => (old.id === q.id ? q : old)),
    );
    setSelected(q.id);
    return q;
  }
  async function action(test = false) {
    setBusy(true);
    setError('');
    try {
      const q = await save();
      if (test) {
        const data = await api(`/apps/${appId}/queries/${q.id}/execute`, 'POST', {});
        setResult(data);
        toast.success('Query completed');
      } else toast.success('Query saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="query-panel">
      <aside>
        <div className="panel-title">
          <h3>Queries</h3>
          <button className="icon-btn" aria-label="New query" onClick={() => setSelected('new')}>
            <Plus size={16} />
          </button>
        </div>
        <p className="panel-description">Bring your app to life with data.</p>
        {queries.map((q) => (
          <button
            className={`query-list-item ${q.id === selected ? 'active' : ''}`}
            key={q.id}
            onClick={() => setSelected(q.id)}
          >
            <Database size={15} />
            {q.name}
            <span>{q.config.method}</span>
          </button>
        ))}
        <div className="source-note">
          <CheckCircle2 size={16} />
          <p>Only approved sources are available. Your data stays in your workspace.</p>
        </div>
      </aside>
      <main>
        <div className="query-editor-header">
          <div>
            <span className="small-kicker">DATA CONNECTION</span>
            <h2>{selected === 'new' ? 'A new connection' : name}</h2>
          </div>
          <div>
            {selected !== 'new' && (
              <button
                className="icon-btn danger"
                aria-label="Delete query"
                onClick={async () => {
                  try {
                    await api(`/apps/${appId}/queries/${selected}`, 'DELETE');
                    onChange(queries.filter((q) => q.id !== selected));
                    setSelected(queries.find((q) => q.id !== selected)?.id ?? 'new');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => action()}>
              Save query
            </Button>
            <Button disabled={busy} onClick={() => action(true)}>
              <Play size={14} />
              {busy ? 'Working…' : 'Test request'}
            </Button>
          </div>
        </div>
        <div className="query-form">
          <label className="field">
            Query name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="getCustomers"
            />
          </label>
          <label className="field">
            Data source
            <select
              value={source?.id ?? ''}
              onChange={(e) => {
                setSourceId(e.target.value);
                setResource(
                  sources.data?.find((s) => s.id === e.target.value)?.kind === 'mock'
                    ? 'customers'
                    : 'users',
                );
              }}
            >
              {sources.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-inline">
            <label className="field">
              Method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>GET</option>
                <option>POST</option>
              </select>
            </label>
            <label className="field flex-1">
              Resource
              <select value={resource} onChange={(e) => setResource(e.target.value)}>
                {(source?.kind === 'mock' ? ['customers'] : ['users', 'posts', 'todos']).map(
                  (r) => (
                    <option key={r}>{r}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="source-url">
            <Link2 size={14} />
            {source?.kind === 'mock'
              ? 'mock://customers'
              : `https://jsonplaceholder.typicode.com/${resource}`}
          </div>
          <div className="query-json-grid">
            <label className="field">
              Headers (JSON)
              <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} />
            </label>
            <label className="field">
              Query parameters (JSON)
              <textarea value={params} onChange={(e) => setParams(e.target.value)} />
            </label>
            {method === 'POST' && (
              <label className="field">
                Request body (JSON)
                <textarea value={body} onChange={(e) => setBody(e.target.value)} />
              </label>
            )}
          </div>
          <label className="checkbox-field">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Run automatically when the app opens
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="query-result">
          <div>
            <strong>Response</strong>
            {result !== undefined && (
              <span className="status-badge published">
                <i />
                Success
              </span>
            )}
          </div>
          {result === undefined ? (
            <p>Test your request to see the response here.</p>
          ) : (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';
import { useEffect, useState, useId } from 'react';
import { Copy, Trash2, Settings2, MousePointer2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { registry, type PropertyField } from '@/features/component-registry/registry';
import type { ActionConfig, PageData, QueryData } from '@/entities/ui-node/types';
import { useEditorStore } from '../model/editor-store';
import {
  duplicateNode,
  removeNode,
  updateNodeEvents,
  updateNodeProps,
} from '../model/editor-commands';
import { componentIcons } from './palette';
export function Inspector({ queries, pages }: { queries: QueryData[]; pages: PageData[] }) {
  const id = useEditorStore((s) => s.selectedId);
  const node = useEditorStore((s) => (s.selectedId ? s.document.nodes[s.selectedId] : undefined));
  const [tab, setTab] = useState('content');
  if (!node || !id)
    return (
      <aside className="inspector">
        <div className="panel-title">
          <h3>Properties</h3>
          <Settings2 size={16} />
        </div>
        <div className="inspector-empty">
          <span>
            <MousePointer2 size={30} />
          </span>
          <h3>A little fine-tuning.</h3>
          <p>Select a component on the canvas to make it your own.</p>
          <div>
            <span>Content</span>
            <span>Style</span>
            <span>Events</span>
          </div>
        </div>
        <div className="inspector-footer">Every detail, just the way you need it.</div>
      </aside>
    );
  const def = registry[node.type];
  const Icon = componentIcons[node.type];
  function change(key: string, value: unknown) {
    try {
      useEditorStore.getState().commit((d) => updateNodeProps(d, id!, { [key]: value }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function eventChange(event: string, action?: ActionConfig) {
    try {
      const events = { ...node!.events };
      if (action) events[event] = action;
      else delete events[event];
      useEditorStore.getState().commit((d) => updateNodeEvents(d, id!, events));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>
          <Icon size={18} />
        </span>
        <div>
          <strong>{node.type}</strong>
          <small>Component properties</small>
        </div>
        <button
          className="icon-btn"
          aria-label="Duplicate component"
          disabled={id === 'root'}
          onClick={() => useEditorStore.getState().commit((d) => duplicateNode(d, id))}
        >
          <Copy size={15} />
        </button>
        <button
          className="icon-btn danger"
          aria-label="Delete component"
          disabled={id === 'root'}
          onClick={() => useEditorStore.getState().commit((d) => removeNode(d, id))}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="inspector-tabs">
        {['content', 'style', 'events'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="inspector-fields" key={id}>
        {tab === 'events' ? (
          def.events.length ? (
            def.events.map((event) => (
              <EventField
                key={event}
                event={event}
                action={node.events?.[event]}
                queries={queries}
                pages={pages}
                onChange={(a) => eventChange(event, a)}
              />
            ))
          ) : (
            <div className="event-empty">
              <MousePointer2 size={20} />
              <p>This component has no events.</p>
            </div>
          )
        ) : (
          def.fields
            .filter((f) => f.group === tab)
            .map((field) => (
              <PropertyEditor
                key={field.key}
                field={field}
                value={node.props[field.key] ?? def.defaultProps[field.key]}
                onChange={(value) => change(field.key, value)}
              />
            ))
        )}
        {tab === 'content' && (
          <div className="binding-tip">
            <Link2 size={14} />
            <p>
              Bind a value with <code>queries.getCustomers.data</code> or <code>app.name</code>.
            </p>
          </div>
        )}
      </div>
      <div className="inspector-node-id">
        <span>Component ID</span>
        <code title={id}>{id.slice(0, 18)}…</code>
        <button
          className="icon-btn"
          aria-label="Copy component ID"
          onClick={() =>
            navigator.clipboard.writeText(id).then(() => toast.success('Component ID copied'))
          }
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="inspector-footer">
        <span className="green-dot" />
        Changes update your canvas instantly
      </div>
    </aside>
  );
}
function PropertyEditor({
  field,
  value,
  onChange,
}: {
  field: PropertyField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputId = useId();
  const isBinding =
    !!value && typeof value === 'object' && 'kind' in value && value.kind === 'binding';
  const [binding, setBinding] = useState(isBinding);
  useEffect(() => setBinding(isBinding), [isBinding]);
  const [draft, setDraft] = useState(JSON.stringify(value ?? [], null, 2));
  const [error, setError] = useState('');
  useEffect(() => {
    if (field.kind === 'json') setDraft(JSON.stringify(value ?? [], null, 2));
  }, [value, field.kind]);
  const bindable =
    ['string', 'boolean', 'json'].includes(field.kind) &&
    ['text', 'label', 'defaultValue', 'disabled', 'data'].includes(field.key);
  return (
    <div className="property-field">
      <span>
        <label htmlFor={inputId}>{field.label}</label>
        {bindable && (
          <button
            type="button"
            className={binding ? 'binding-toggle active' : 'binding-toggle'}
            title="Toggle data binding"
            aria-label={`Bind ${field.label}`}
            onClick={() => {
              setBinding((v) => !v);
              if (binding)
                onChange(field.kind === 'boolean' ? false : field.kind === 'json' ? [] : '');
            }}
          >
            <Link2 size={12} />
          </button>
        )}
      </span>
      {binding ? (
        <input
          id={inputId}
          className="binding-input"
          placeholder="app.name"
          defaultValue={isBinding ? String((value as unknown as { path: string }).path) : ''}
          onBlur={(e) => {
            if (e.target.value) onChange({ kind: 'binding', path: e.target.value });
          }}
        />
      ) : field.kind === 'boolean' ? (
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : field.kind === 'enum' ? (
        <select
          id={inputId}
          value={String(value ?? field.options?.[0] ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : field.kind === 'number' ? (
        <input
          id={inputId}
          type="number"
          value={Number(value ?? 0)}
          min={field.min}
          max={field.max}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (next >= (field.min ?? -Infinity) && next <= (field.max ?? Infinity)) onChange(next);
          }}
        />
      ) : field.kind === 'color' ? (
        <div className="color-field">
          <input
            type="color"
            aria-label={`${field.label} picker`}
            value={String(value === 'transparent' ? '#ffffff' : (value ?? '#ffffff'))}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            id={inputId}
            aria-label={field.label}
            value={String(value ?? '#ffffff')}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value) || e.target.value === 'transparent')
                onChange(e.target.value);
            }}
          />
        </div>
      ) : field.kind === 'json' ? (
        <textarea
          id={inputId}
          className="json-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            try {
              const parsed: unknown = JSON.parse(draft);
              onChange(parsed);
              setError('');
            } catch {
              setError('Enter valid JSON.');
            }
          }}
        />
      ) : (
        <input
          id={inputId}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}{' '}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
function EventField({
  event,
  action,
  onChange,
  queries,
  pages,
}: {
  event: string;
  action?: ActionConfig;
  onChange: (a?: ActionConfig) => void;
  queries: QueryData[];
  pages: PageData[];
}) {
  function choose(type: string) {
    if (type === 'showToast') onChange({ type, message: 'Action completed!' });
    else if (type === 'runQuery') onChange({ type, queryId: queries[0]?.id ?? '' });
    else if (type === 'navigate') onChange({ type, pageId: pages[0]?.id ?? '' });
    else if (type === 'setValue') onChange({ type, key: 'value', value: '' });
    else if (type === 'resetForm') onChange({ type });
    else onChange(undefined);
  }
  return (
    <div className="event-field">
      <span className="event-label">
        <ZapIcon /> {event}
      </span>
      <label className="property-field">
        <span>Action</span>
        <select value={action?.type ?? 'none'} onChange={(e) => choose(e.target.value)}>
          <option value="none">No action</option>
          <option value="showToast">Show toast</option>
          <option value="runQuery">Run query</option>
          <option value="navigate">Navigate to page</option>
          <option value="setValue">Set state value</option>
          <option value="resetForm">Reset inputs</option>
        </select>
      </label>
      {action?.type === 'showToast' && (
        <label className="property-field">
          <span>Message</span>
          <input
            value={action.message}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
          />
        </label>
      )}
      {action?.type === 'runQuery' && (
        <label className="property-field">
          <span>Query</span>
          <select
            value={action.queryId}
            onChange={(e) => onChange({ ...action, queryId: e.target.value })}
          >
            {queries.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {action?.type === 'navigate' && (
        <label className="property-field">
          <span>Page</span>
          <select
            value={action.pageId}
            onChange={(e) => onChange({ ...action, pageId: e.target.value })}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {action?.type === 'setValue' && (
        <>
          <label className="property-field">
            <span>State key</span>
            <input
              value={action.key}
              onChange={(e) => onChange({ ...action, key: e.target.value })}
            />
          </label>
          <label className="property-field">
            <span>Value</span>
            <input
              value={String(action.value)}
              onChange={(e) => onChange({ ...action, value: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
function ZapIcon() {
  return <span>ϟ</span>;
}

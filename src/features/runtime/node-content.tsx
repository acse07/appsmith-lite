'use client';
import { memo, useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Database, LoaderCircle, RefreshCw } from 'lucide-react';
import { registry } from '@/features/component-registry/registry';
import { resolveBinding } from '@/features/bindings/resolve';
import type { UINode } from '@/entities/ui-node/types';
import { useRuntime } from './runtime-context';
export const NodeContent = memo(function NodeContent({
  node,
  children,
  interactive = true,
}: {
  node: UINode;
  children?: ReactNode;
  interactive?: boolean;
}) {
  const runtime = useRuntime(node);
  const props: Record<string, unknown> = {};
  let error = '';
  try {
    for (const [key, value] of Object.entries({
      ...registry[node.type].defaultProps,
      ...node.props,
    }))
      props[key] = resolveBinding(value, runtime.context);
    registry[node.type].propsSchema.parse(props);
  } catch {
    error = 'This binding returns a value of the wrong type. Check the path and property.';
  }
  const defaultValue = props.defaultValue;
  const inputValue = runtime.inputs[node.id];
  const setInput = runtime.setInput;
  useEffect(() => {
    if (
      !error &&
      ['Input', 'Select'].includes(node.type) &&
      !inputValue &&
      defaultValue !== undefined
    )
      setInput(node.id, defaultValue);
  }, [node.type, node.id, inputValue, defaultValue, setInput, error]);
  if (error)
    return (
      <div className="runtime-error" role="alert">
        {error}
      </div>
    );
  const style: CSSProperties = {
    background: typeof props.background === 'string' ? props.background : undefined,
    width: props.width === 'full' ? '100%' : undefined,
    color: typeof props.color === 'string' ? props.color : undefined,
  };
  switch (registry[node.type].render) {
    case 'Container':
      return (
        <div
          className="runtime-container"
          style={{
            ...style,
            flexDirection: props.direction === 'row' ? 'row' : 'column',
            gap: Number(props.gap ?? 16),
            padding: Number(props.padding ?? 0),
          }}
        >
          {children}
        </div>
      );
    case 'Heading': {
      const Tag = `h${props.level ?? 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <Tag className="runtime-heading" style={style}>
          {String(props.text ?? '')}
        </Tag>
      );
    }
    case 'Text':
      return (
        <p
          className="runtime-text"
          style={{
            ...style,
            fontSize: Number(props.fontSize ?? 14),
            fontWeight: props.bold ? 600 : 400,
          }}
        >
          {String(props.text ?? '')}
        </p>
      );
    case 'Button':
      return (
        <button
          type="button"
          disabled={Boolean(props.disabled)}
          className={`runtime-button ${String(props.variant)} ${String(props.size)}`}
          style={style}
          onClick={(event) => {
            if (!interactive) return;
            const action = node.events?.onClick;
            if (
              action?.type === 'runQuery' &&
              runtime.queryList.find((q) => q.id === action.queryId)?.config.method === 'POST'
            ) {
              const fields = event.currentTarget
                .closest('.runtime-renderer')
                ?.querySelectorAll<HTMLInputElement>('input');
              if (fields && !Array.from(fields).every((input) => input.reportValidity())) return;
            }
            void runtime.act(action);
          }}
        >
          {node.events?.onClick?.type === 'runQuery' && <RefreshCw size={14} />}{' '}
          {String(props.label ?? 'Button')}
        </button>
      );
    case 'Input':
      return (
        <label className="runtime-field" style={style}>
          <span>
            {String(props.label ?? '')}
            {Boolean(props.required) && <b> *</b>}
          </span>
          <input
            readOnly={!interactive}
            type={String(props.inputType ?? 'text')}
            required={Boolean(props.required)}
            placeholder={String(props.placeholder ?? '')}
            value={String(runtime.inputs[node.id]?.value ?? props.defaultValue ?? '')}
            onChange={(e) => {
              runtime.setInput(node.id, e.target.value);
              if (interactive) void runtime.act(node.events?.onChange);
            }}
          />
        </label>
      );
    case 'Select':
      return (
        <label className="runtime-field" style={style}>
          <span>{String(props.label ?? '')}</span>
          <select
            disabled={!interactive}
            value={String(runtime.inputs[node.id]?.value ?? props.defaultValue ?? '')}
            onChange={(e) => {
              runtime.setInput(node.id, e.target.value);
              if (interactive) void runtime.act(node.events?.onChange);
            }}
          >
            {((props.options as string[]) ?? []).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      );
    case 'Table': {
      const binding = node.props.data as { kind?: string; path?: string } | undefined;
      const queryName = binding?.kind === 'binding' ? binding.path?.split('.')[1] : undefined;
      const result = queryName ? runtime.queries[queryName] : undefined;
      return (
        <DataTable
          data={Array.isArray(props.data) ? props.data : []}
          columns={(props.columns as string[]) ?? []}
          pageSize={Number(props.pageSize ?? 5)}
          pagination={props.pagination !== false}
          isLoading={result?.isLoading}
          error={result?.error}
          onSelect={(row) => {
            if (interactive) {
              runtime.rowSelect(row);
              void runtime.act(node.events?.onRowSelect);
            }
          }}
        />
      );
    }
    case 'Divider':
      return (
        <hr
          style={{
            ...style,
            border: 0,
            borderTop: `${props.thickness ?? 1}px solid ${props.color ?? '#e8ecf0'}`,
            margin: 0,
            width: '100%',
          }}
        />
      );
  }
});
function cell(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
export function DataTable({
  data,
  columns,
  pageSize,
  pagination,
  isLoading,
  error,
  onSelect,
}: {
  data: Record<string, unknown>[];
  columns: string[];
  pageSize: number;
  pagination: boolean;
  isLoading?: boolean;
  error?: string;
  onSelect: (row: Record<string, unknown>) => void;
}) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const total = Math.max(1, Math.ceil(data.length / pageSize));
  const active = Math.min(page, total - 1);
  const virtual = !pagination && data.length > 100;
  const start = virtual
    ? Math.min(Math.max(0, Math.floor((scrollTop - 38) / 52) - 4), Math.max(0, data.length - 20))
    : 0;
  const offset = pagination ? active * pageSize : start;
  const rows = pagination
    ? data.slice(active * pageSize, (active + 1) * pageSize)
    : virtual
      ? data.slice(start, start + 20)
      : data;
  return (
    <div className="runtime-table">
      <div className="runtime-table-title">
        <strong>
          Customers<span>{data.length}</span>
        </strong>
        {isLoading ? (
          <span>
            <LoaderCircle className="spin" size={13} />
            Loading
          </span>
        ) : (
          <span>
            <span className="green-dot" />
            Live data
          </span>
        )}
      </div>
      {error ? (
        <div className="runtime-error" role="alert">
          {error}
        </div>
      ) : (
        <>
          <div
            className="table-scroll"
            onScroll={(e) => virtual && setScrollTop(e.currentTarget.scrollTop)}
          >
            <table aria-rowcount={data.length + 1}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c.replaceAll('_', ' ').replace(/^./, (v) => v.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {virtual && start > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={columns.length}
                      style={{ height: start * 52, padding: 0, border: 0 }}
                    />
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr
                    key={String(row.id ?? i)}
                    aria-rowindex={offset + i + 2}
                    style={virtual ? { height: 52 } : undefined}
                    className={selected === i + offset ? 'selected' : ''}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelected(i + offset);
                        onSelect(row);
                      }
                    }}
                    onClick={() => {
                      setSelected(i + offset);
                      onSelect(row);
                    }}
                  >
                    {columns.map((c, j) => (
                      <td key={c}>
                        {c === 'status' ? (
                          <span className={`customer-status ${String(row[c]).toLowerCase()}`}>
                            <i />
                            {cell(row[c])}
                          </span>
                        ) : j === 0 ? (
                          <span className="table-person">
                            <span>
                              {cell(row[c])
                                .split(' ')
                                .slice(0, 2)
                                .map((v) => v[0])
                                .join('')}
                            </span>
                            <strong>{cell(row[c])}</strong>
                          </span>
                        ) : (
                          cell(row[c])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {virtual && start + rows.length < data.length && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={columns.length}
                      style={{
                        height: (data.length - start - rows.length) * 52,
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
            {!rows.length && !isLoading && (
              <div className="table-empty">
                <Database size={24} />
                <p>No data yet. Run a query to fill this table.</p>
              </div>
            )}
            {isLoading && !rows.length && (
              <div className="table-empty">
                <LoaderCircle className="spin" size={24} />
                Loading data…
              </div>
            )}
          </div>
          {pagination && (
            <div className="table-pagination">
              <span>
                {data.length
                  ? `${active * pageSize + 1}–${Math.min((active + 1) * pageSize, data.length)}`
                  : '0'}{' '}
                of {data.length} results
              </span>
              <div>
                <button
                  disabled={active === 0}
                  onClick={() => setPage(active - 1)}
                  aria-label="Previous table page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  Page {active + 1} of {total}
                </span>
                <button
                  disabled={active >= total - 1}
                  onClick={() => setPage(active + 1)}
                  aria-label="Next table page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

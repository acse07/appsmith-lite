'use client';
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/shared/lib/api';
import type { ActionConfig, QueryData, UINode } from '@/entities/ui-node/types';
import { executeAction } from '@/features/actions/execute';
import { registry } from '@/features/component-registry/registry';
import { resolveBinding, type RuntimeContext } from '@/features/bindings/resolve';
interface QueryResult {
  data?: unknown;
  isLoading: boolean;
  error?: string;
}
interface RuntimeState {
  inputs: Record<string, { value: unknown }>;
  state: Record<string, unknown>;
  queries: Record<string, QueryResult>;
  requests: Record<string, number>;
}
interface RuntimeController {
  store: StoreApi<RuntimeState>;
  name: string;
  queryList: QueryData[];
  setInput: (id: string, value: unknown) => void;
  rowSelect: (row: Record<string, unknown>) => void;
  act: (a?: ActionConfig) => Promise<void>;
  runQuery: (id: string) => Promise<void>;
}
const Runtime = createContext<RuntimeController | null>(null);
const emptyInputs: RuntimeState['inputs'] = {};
const emptyState: RuntimeState['state'] = {};
const emptyQueries: RuntimeState['queries'] = {};
export function useRuntime(node: UINode) {
  const value = useContext(Runtime);
  if (!value) throw new Error('RuntimeProvider missing');
  const paths = Object.values({ ...registry[node.type].defaultProps, ...node.props })
    .filter(
      (p): p is { kind: string; path: string } =>
        !!p &&
        typeof p === 'object' &&
        'kind' in p &&
        p.kind === 'binding' &&
        'path' in p &&
        typeof p.path === 'string',
    )
    .map((p) => p.path);
  const ownInput = useStore(value.store, (s) => s.inputs[node.id]);
  const boundInputs = useStore(value.store, (s) =>
    paths.some((p) => p.startsWith('inputs.')) ? s.inputs : emptyInputs,
  );
  const state = useStore(value.store, (s) =>
    paths.some((p) => p.startsWith('state.')) ? s.state : emptyState,
  );
  const queries = useStore(value.store, (s) =>
    paths.some((p) => p.startsWith('queries.')) ? s.queries : emptyQueries,
  );
  const inputs = ownInput ? { ...boundInputs, [node.id]: ownInput } : boundInputs;
  return {
    ...value,
    inputs,
    queries,
    context: { app: { name: value.name }, inputs, state, queries } satisfies RuntimeContext,
  };
}
export function RuntimeProvider({
  appId,
  name,
  queryList,
  versionId,
  onNavigate,
  children,
}: {
  appId: string;
  name: string;
  queryList: QueryData[];
  versionId?: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<RuntimeState>(() => ({ inputs: {}, state: {}, queries: {}, requests: {} })),
  );
  const controller = useMemo<RuntimeController>(() => {
    const context = (): RuntimeContext => ({ app: { name }, ...store.getState() });
    const runQuery = async (id: string) => {
      const q = queryList.find((q) => q.id === id);
      if (!q) {
        toast.error('Query not found');
        return;
      }
      const request = (store.getState().requests[q.name] ?? 0) + 1;
      store.setState((s) => ({
        requests: { ...s.requests, [q.name]: request },
        queries: {
          ...s.queries,
          [q.name]: { ...s.queries[q.name], isLoading: true, error: undefined },
        },
      }));
      try {
        const current = context();
        const values = Object.keys(q.config.body).length
          ? Object.fromEntries(
              Object.entries(q.config.body).map(([k, v]) => [k, resolveBinding(v, current)]),
            )
          : Object.fromEntries(
              Object.entries(current.inputs).map(([k, v]) => [k, (v as { value: unknown }).value]),
            );
        const data = await api(
          `/apps/${appId}/queries/${id}/execute${versionId ? `?versionId=${versionId}` : ''}`,
          'POST',
          { values },
        );
        if (store.getState().requests[q.name] === request)
          store.setState((s) => ({
            queries: { ...s.queries, [q.name]: { data, isLoading: false } },
          }));
      } catch (e) {
        const error = (e as Error).message;
        if (store.getState().requests[q.name] === request) {
          store.setState((s) => ({
            queries: { ...s.queries, [q.name]: { ...s.queries[q.name], isLoading: false, error } },
          }));
          toast.error(error);
        }
      }
    };
    return {
      store,
      name,
      queryList,
      runQuery,
      setInput: (id, value) =>
        store.setState((s) => ({ inputs: { ...s.inputs, [id]: { value } } })),
      rowSelect: (row) =>
        store.setState((s) => ({ state: { ...s.state, selectedCustomer: row, selectedRow: row } })),
      act: async (action) => {
        if (!action) return;
        try {
          await executeAction(action, context(), {
            runQuery,
            navigate: onNavigate,
            showToast: (message) => toast.success(message),
            setValue: (key, value) =>
              store.setState((s) => ({ state: { ...s.state, [key]: value } })),
            resetForm: () => store.setState({ inputs: {} }),
          });
        } catch (e) {
          toast.error((e as Error).message);
        }
      },
    };
  }, [appId, name, queryList, versionId, onNavigate, store]);
  useEffect(() => {
    for (const q of queryList.filter((q) => q.config.runOnLoad)) void controller.runQuery(q.id);
    // Input edits and canvas saves must not re-run queries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, queryList, versionId]);
  return <Runtime.Provider value={controller}>{children}</Runtime.Provider>;
}

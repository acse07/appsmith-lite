'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, Globe } from 'lucide-react';
import { api } from '@/shared/lib/api';
import type { AppData, AppSnapshot } from '@/entities/ui-node/types';
import { ErrorState, Loading, Logo } from '@/shared/ui/primitives';
import { RuntimeProvider } from './runtime-context';
import { RuntimeRenderer } from './runtime-renderer';
interface Published {
  versionId: string;
  number: number;
  snapshot: AppSnapshot;
  workspaceId: string;
}
export function RuntimePage({ appId, preview = false }: { appId: string; preview?: boolean }) {
  const [pageId, setPageId] = useState('');
  const navigate = useCallback((id: string) => setPageId(id), []);
  const query = useQuery<AppData | Published>({
    queryKey: ['runtime', appId, preview],
    queryFn: () =>
      preview ? api<AppData>(`/apps/${appId}`) : api<Published>(`/apps/${appId}/runtime`),
  });
  if (query.isLoading) return <Loading text="Opening your application…" />;
  if (query.error) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data!;
  const snapshot = 'snapshot' in data ? data.snapshot : data;
  const page = snapshot.pages.find((p) => p.id === pageId) ?? snapshot.pages[0];
  return (
    <div className="published-shell">
      <header className="published-header">
        <Link href="/" aria-label="Back to workspace">
          <Logo compact />
        </Link>
        <strong>{snapshot.name}</strong>
        <div>
          {preview ? (
            <span>
              <Eye size={14} />
              Draft preview
            </span>
          ) : (
            <span>
              <Globe size={14} />
              Version {'number' in data ? data.number : 1}
            </span>
          )}
          <Link
            href={
              preview
                ? `/apps/${appId}/edit`
                : `/workspaces/${'workspaceId' in data ? data.workspaceId : ''}`
            }
          >
            <ArrowLeft size={14} />
            {preview ? 'Back to editor' : 'Workspace'}
          </Link>
        </div>
      </header>
      <nav className="runtime-pages">
        {snapshot.pages.map((p) => (
          <button
            key={p.id}
            className={page?.id === p.id ? 'active' : ''}
            onClick={() => setPageId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </nav>
      <main className="published-content">
        <RuntimeProvider
          appId={appId}
          name={snapshot.name}
          queryList={snapshot.queries}
          versionId={'versionId' in data ? data.versionId : undefined}
          onNavigate={navigate}
        >
          {page && <RuntimeRenderer key={page.id} document={page.document} />}
        </RuntimeProvider>
      </main>
      <footer className="published-footer">
        Built with <Link href="/">AppSmith Lite</Link>
      </footer>
    </div>
  );
}

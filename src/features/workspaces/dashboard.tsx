'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Blocks,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderOpen,
  Globe,
  Grid2X2,
  LayoutTemplate,
  LogOut,
  Plus,
  Search,
  Users,
  Workflow,
  Zap,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/lib/api';
import { Button, ErrorState, Loading, Logo, Menu, MenuItem, Modal } from '@/shared/ui/primitives';
interface Workspace {
  id: string;
  name: string;
  members: { role: 'OWNER' | 'EDITOR' | 'VIEWER' }[];
}
interface Application {
  id: string;
  name: string;
  description: string;
  color: string;
  publishedVersionId: string | null;
  updatedAt: string;
  _count: { pages: number; queries: number };
}
interface Member {
  id: string;
  role: string;
  user: { name: string; email: string };
}
export function Dashboard({
  user,
  workspaceId,
}: {
  user: { name: string; email: string };
  workspaceId?: string;
}) {
  const router = useRouter();
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('apps');
  const [ascending, setAscending] = useState(false);
  const [dialog, setDialog] = useState<
    'app' | 'workspace' | 'rename' | 'delete' | 'settings' | null
  >(null);
  const [target, setTarget] = useState<Application | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const workspaces = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api<Workspace[]>('/workspaces'),
  });
  const active = workspaces.data?.find((w) => w.id === workspaceId) ?? workspaces.data?.[0];
  const activeId = active?.id;
  const canEdit = active?.members[0]?.role !== 'VIEWER';
  const owner = active?.members[0]?.role === 'OWNER';
  const apps = useQuery({
    queryKey: ['apps', activeId],
    queryFn: () => api<Application[]>(`/workspaces/${activeId}/apps`),
    enabled: !!activeId,
  });
  const members = useQuery({
    queryKey: ['members', activeId],
    queryFn: () => api<Member[]>(`/workspaces/${activeId}/members`),
    enabled: !!activeId && dialog === 'settings',
  });
  const filtered =
    apps.data
      ?.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) &&
          (tab === 'all' || (tab === 'published' ? !!a.publishedVersionId : !a.publishedVersionId)),
      )
      .sort((a, b) =>
        ascending
          ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
          : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ) ?? [];
  const published = apps.data?.filter((a) => a.publishedVersionId).length ?? 0;
  function openCreate(isTemplate = false) {
    setTemplate(isTemplate);
    setName(isTemplate ? 'Customer management' : '');
    setDialog('app');
  }
  async function refresh() {
    await cache.invalidateQueries({ queryKey: ['apps', activeId] });
    await cache.invalidateQueries({ queryKey: ['workspaces'] });
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    await act(async () => {
      if (dialog === 'workspace') {
        const w = await api<Workspace>('/workspaces', 'POST', { name });
        await refresh();
        setDialog(null);
        router.push(`/workspaces/${w.id}`);
      }
      if (dialog === 'app') {
        const app = await api<Application>(`/workspaces/${activeId}/apps`, 'POST', {
          name,
          template,
        });
        await refresh();
        setDialog(null);
        router.push(`/apps/${app.id}/edit`);
      }
      if (dialog === 'rename' && target) {
        await api(`/apps/${target.id}`, 'PATCH', { name });
        await refresh();
        setDialog(null);
        toast.success('Application renamed');
      }
      if (dialog === 'delete' && target) {
        await api(`/apps/${target.id}`, 'DELETE');
        await refresh();
        setDialog(null);
        toast.success('Application deleted');
      }
    });
  }
  async function duplicate(app: Application) {
    await act(async () => {
      await api(`/apps/${app.id}/duplicate`, 'POST', {});
      await refresh();
      toast.success('Application duplicated');
    });
  }
  async function logout() {
    await api('/auth/logout', 'POST', {});
    cache.clear();
    router.push('/login');
    router.refresh();
  }
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-link">
          <Logo />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">{active?.name[0] ?? 'W'}</span>
          <div>
            <strong>{active?.name ?? 'Your workspace'}</strong>
            <small>{active?.members[0]?.role.toLowerCase() ?? 'Create a workspace'}</small>
          </div>
          <ChevronDown size={15} />
          <select
            aria-label="Switch workspace"
            value={activeId ?? ''}
            onChange={(e) => router.push(`/workspaces/${e.target.value}`)}
          >
            {workspaces.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-caption">WORKSPACE</span>
          <button className={view === 'apps' ? 'active' : ''} onClick={() => setView('apps')}>
            <Grid2X2 size={18} />
            Applications<span className="nav-count">{apps.data?.length ?? 0}</span>
          </button>
          {canEdit && (
            <button
              className={view === 'templates' ? 'active' : ''}
              onClick={() => setView('templates')}
            >
              <LayoutTemplate size={18} />
              Templates<span className="new-label">NEW</span>
            </button>
          )}
          {owner && (
            <button
              onClick={() => {
                setDialog('settings');
                setName(active?.name ?? '');
              }}
            >
              <Users size={18} />
              Members & settings
            </button>
          )}
        </nav>
        <div className="sidebar-apps">
          <div className="nav-caption">
            YOUR APPLICATIONS
            {canEdit && (
              <button
                className="icon-btn"
                aria-label="New application"
                onClick={() => openCreate()}
              >
                <Plus size={15} />
              </button>
            )}
          </div>
          {apps.data?.map((a) => (
            <Link key={a.id} href={canEdit ? `/apps/${a.id}/edit` : `/run/${a.id}`}>
              <span className={`app-dot ${a.color}`} />
              {a.name}
              <ChevronRight size={13} />
            </Link>
          ))}
          <button
            className="add-workspace"
            onClick={() => {
              setName('');
              setDialog('workspace');
            }}
          >
            <Plus size={14} />
            New workspace
          </button>
        </div>
        <div className="sidebar-bottom">
          <Link href="/guide" className="help-link">
            <BookOpen size={17} />
            Builder guide
            <ExternalLink size={13} />
          </Link>
          <div className="sidebar-user">
            <span className="user-avatar">
              {user.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email.startsWith('demo-') ? 'Demo account' : user.email}</small>
            </div>
            <button className="icon-btn" aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <FolderOpen size={16} />
            <span>{active?.name ?? 'Workspace'}</span>
            <ChevronRight size={14} />
            <strong>{view === 'templates' ? 'Templates' : 'Applications'}</strong>
          </div>
          <span className="header-note">
            <span className="green-dot" />
            All systems ready
          </span>
        </header>
        <main className="dashboard-content">
          <div className="page-intro">
            <div>
              <span className="small-kicker">YOUR WORKSPACE, REIMAGINED</span>
              <h1>
                {view === 'templates'
                  ? 'A head start for your next idea.'
                  : 'Your ideas. Ready to build.'}
              </h1>
              <p>
                {view === 'templates'
                  ? 'Start with a thoughtful foundation. Make it entirely yours.'
                  : 'Create the tools your team needs. Make work flow a little better.'}
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => openCreate()}>
                <Plus size={18} />
                Create application
              </Button>
            )}
          </div>
          {view === 'apps' && (
            <>
              <section className="overview-stats">
                <div>
                  <span className="stat-icon peach">
                    <Blocks size={19} />
                  </span>
                  <div>
                    <small>Applications</small>
                    <strong>{apps.data?.length ?? '—'}</strong>
                  </div>
                  <span>Your ideas in motion</span>
                </div>
                <div>
                  <span className="stat-icon mint">
                    <Globe size={19} />
                  </span>
                  <div>
                    <small>Published</small>
                    <strong>{published}</strong>
                  </div>
                  <span>Ready for your team</span>
                </div>
                <div>
                  <span className="stat-icon lavender">
                    <Workflow size={19} />
                  </span>
                  <div>
                    <small>Connected queries</small>
                    <strong>{apps.data?.reduce((n, a) => n + a._count.queries, 0) ?? '—'}</strong>
                  </div>
                  <span>Data that does more</span>
                </div>
              </section>
              <section className="welcome-banner">
                <div>
                  <span className="banner-label">
                    <Zap size={13} /> SMALL STEPS. USEFUL TOOLS.
                  </span>
                  <h2>From workflow to working app.</h2>
                  <p>Drag, connect, and create. Your next internal tool is a canvas away.</p>
                  <button onClick={() => (canEdit ? openCreate(true) : setTab('published'))}>
                    {' '}
                    {canEdit ? 'Start with a template' : 'Explore published apps'}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="banner-art" aria-hidden="true">
                  <div className="banner-grid" />
                  <span className="flow-card flow-one">
                    <span className="flow-icon">
                      <Grid2X2 size={18} />
                    </span>
                    <strong>Your interface</strong>
                    <small>Make it yours</small>
                  </span>
                  <span className="flow-line" />
                  <span className="flow-card flow-two">
                    <span className="flow-icon mint">
                      <Workflow size={18} />
                    </span>
                    <strong>Your data</strong>
                    <small>Bring it together</small>
                  </span>
                  <span className="flow-spark">
                    <Zap size={18} />
                  </span>
                  <span className="flow-check">
                    <Check size={14} />
                  </span>
                </div>
              </section>
            </>
          )}
          <section className="applications-section">
            <div className="section-title">
              <h2>
                {view === 'templates' ? 'Made to make things easier' : 'Your applications'}
                <span>{view === 'templates' ? '1' : (apps.data?.length ?? 0)}</span>
              </h2>
              <span>
                {view === 'templates'
                  ? 'A useful place to start'
                  : 'A home for everything you’re building'}
              </span>
            </div>
            {view === 'templates' ? (
              <div className="template-card">
                <AppThumbnail color="orange" />
                <div>
                  <span className="template-tag">CUSTOMER OPERATIONS</span>
                  <h3>Customer management</h3>
                  <p>
                    Customer directory, editable fields, a connected table and working query. All
                    ready for your ideas.
                  </p>
                  <Button onClick={() => openCreate(true)}>
                    Use template
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="applications-toolbar">
                  <div className="filter-tabs">
                    {[
                      ['all', 'All applications'],
                      ['published', 'Published'],
                      ['draft', 'Drafts'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={tab === value ? 'active' : ''}
                        onClick={() => setTab(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="application-tools">
                    <div className="search-box">
                      <Search size={16} />
                      <input
                        aria-label="Search applications"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search applications…"
                      />
                      <kbd>⌕</kbd>
                    </div>
                    <button className="sort-btn" onClick={() => setAscending((v) => !v)}>
                      <ArrowDownWideNarrow size={16} />
                      {ascending ? 'Oldest first' : 'Last updated'}
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </div>
                {workspaces.isLoading || apps.isLoading ? (
                  <Loading />
                ) : workspaces.error || apps.error ? (
                  <ErrorState
                    error={(workspaces.error ?? apps.error)!}
                    retry={() => {
                      workspaces.refetch();
                      apps.refetch();
                    }}
                  />
                ) : (
                  <div className="app-grid">
                    {filtered.map((a) => (
                      <article className="app-card" key={a.id}>
                        <Link
                          className="thumbnail-link"
                          href={canEdit ? `/apps/${a.id}/edit` : `/run/${a.id}`}
                          aria-label={`Open ${a.name}`}
                        >
                          <AppThumbnail color={a.color} />
                          <span className="thumbnail-open">
                            {canEdit ? 'Open in editor' : 'Open application'}
                            <ArrowRight size={15} />
                          </span>
                        </Link>
                        <div className="app-card-body">
                          <div className="app-card-heading">
                            <span className={`app-card-icon ${a.color}`}>
                              <Blocks size={18} />
                            </span>
                            <h3>
                              <Link href={canEdit ? `/apps/${a.id}/edit` : `/run/${a.id}`}>
                                {a.name}
                              </Link>
                            </h3>
                            {canEdit && (
                              <Menu label={`Actions for ${a.name}`}>
                                <MenuItem
                                  onSelect={() => {
                                    setTarget(a);
                                    setName(a.name);
                                    setDialog('rename');
                                  }}
                                >
                                  <Pencil size={15} />
                                  Rename
                                </MenuItem>
                                <MenuItem onSelect={() => duplicate(a)}>
                                  <Copy size={15} />
                                  Duplicate
                                </MenuItem>
                                {a.publishedVersionId && (
                                  <MenuItem onSelect={() => router.push(`/run/${a.id}`)}>
                                    <ExternalLink size={15} />
                                    Open published
                                  </MenuItem>
                                )}
                                <MenuItem
                                  danger
                                  onSelect={() => {
                                    setTarget(a);
                                    setDialog('delete');
                                  }}
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </MenuItem>
                              </Menu>
                            )}
                          </div>
                          <p>{a.description}</p>
                          <div className="app-card-meta">
                            <span
                              className={`status-badge ${a.publishedVersionId ? 'published' : 'draft'}`}
                            >
                              <i />
                              {a.publishedVersionId ? 'Published' : 'Draft'}
                            </span>
                            <span>
                              {a._count.pages} {a._count.pages === 1 ? 'page' : 'pages'}
                              <b>·</b>
                              {new Date(a.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                    {canEdit && !search && tab === 'all' && (
                      <button className="create-card" onClick={() => openCreate()}>
                        <span>
                          <Plus size={25} />
                        </span>
                        <strong>A new possibility</strong>
                        <p>
                          Start with a blank canvas.
                          <br />
                          Build something that works for you.
                        </p>
                        <small>
                          Create application
                          <ArrowRight size={14} />
                        </small>
                      </button>
                    )}
                    {filtered.length === 0 && (search || tab !== 'all' || !canEdit) && (
                      <div className="empty-state">
                        <Search size={30} />
                        <h3>No applications here yet</h3>
                        <p>
                          {search ? 'Try a different name.' : 'Your applications will appear here.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="dashboard-footer">
              <span>
                <span className="orange-dot" />
                Built for the way you work.
              </span>
              <Link href="/guide">
                A little help getting started
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </main>
      </div>
      <Modal
        open={dialog !== null}
        onOpenChange={(v) => !v && setDialog(null)}
        title={
          dialog === 'app'
            ? 'Create an application'
            : dialog === 'workspace'
              ? 'A new workspace'
              : dialog === 'rename'
                ? 'Rename application'
                : dialog === 'delete'
                  ? 'Delete application?'
                  : 'Workspace settings'
        }
        description={
          dialog === 'delete'
            ? 'This deletes the draft, pages, queries and published versions.'
            : dialog === 'app'
              ? 'Give your next useful tool a name.'
              : 'Make this space work for your team.'
        }
      >
        {dialog === 'settings' ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(`/workspaces/${activeId}`, 'PATCH', { name });
                  await refresh();
                  toast.success('Workspace updated');
                });
              }}
            >
              <label className="field">
                Workspace name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                />
              </label>
              <Button disabled={busy}>Save name</Button>
            </form>
            <div className="settings-divider" />
            <h3 className="members-title">
              <Users size={17} />
              Workspace members
            </h3>
            <div className="member-list">
              {members.data?.map((m) => (
                <div key={m.id}>
                  <span className="user-avatar">{m.user.name[0]}</span>
                  <div>
                    <strong>{m.user.name}</strong>
                    <small>
                      {m.user.email.startsWith('demo-') ? 'Demo account' : m.user.email}
                    </small>
                  </div>
                  <span>{m.role.toLowerCase()}</span>
                  {m.role !== 'OWNER' && (
                    <button
                      className="icon-btn"
                      aria-label={`Remove ${m.user.name}`}
                      onClick={() =>
                        act(async () => {
                          await api(`/workspaces/${activeId}/members/${m.id}`, 'DELETE');
                          await members.refetch();
                        })
                      }
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(`/workspaces/${activeId}/members`, 'POST', { email, role });
                  setEmail('');
                  await members.refetch();
                  toast.success('Member added');
                });
              }}
            >
              <label className="field">
                Add a registered teammate
                <input
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <div className="form-inline">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  aria-label="Member role"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <Button disabled={busy}>Add member</Button>
              </div>
            </form>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {dialog === 'delete' ? (
              <p className="delete-note">
                Delete <strong>{target?.name}</strong>? This action cannot be undone.
              </p>
            ) : (
              <label className="field">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder={dialog === 'app' ? 'e.g. Inventory tracker' : 'Workspace name'}
                  maxLength={80}
                />
              </label>
            )}
            {dialog === 'app' && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={template}
                  onChange={(e) => setTemplate(e.target.checked)}
                />
                Start with the customer management template
              </label>
            )}
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button disabled={busy} variant={dialog === 'delete' ? 'danger' : 'primary'}>
                {busy
                  ? 'Working…'
                  : dialog === 'delete'
                    ? 'Delete application'
                    : dialog === 'rename'
                      ? 'Save name'
                      : 'Create'}
                {!busy && dialog !== 'delete' && <ArrowRight size={16} />}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
function XIcon() {
  return <Trash2 size={15} />;
}
function AppThumbnail({ color }: { color: string }) {
  return (
    <div className={`app-thumbnail ${color}`}>
      <div className="mini-app">
        <div className="mini-app-bar">
          <span />
          <span />
          <span />
          <i />
        </div>
        <div className="mini-app-layout">
          <div className="mini-app-sidebar">
            <b />
            <i />
            <i />
            <i />
          </div>
          <div className="mini-app-content">
            <b />
            <small />
            <div className="mini-metrics">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-table">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <span />
                  <b />
                  <em />
                  <small />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="thumbnail-tag">
        <span className="green-dot" />{' '}
        {color === 'orange' ? 'Customer operations' : 'Team workspace'}
      </span>
    </div>
  );
}

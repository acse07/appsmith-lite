'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  Code2,
  Copy,
  Database,
  Download,
  Eye,
  Globe,
  History,
  Layers3,
  LoaderCircle,
  Monitor,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/shared/lib/api';
import { Button, ErrorState, Loading, Logo, Modal, Menu, MenuItem } from '@/shared/ui/primitives';
import type { AppData, ComponentType, PageData, UIDocument } from '@/entities/ui-node/types';
import { validateDocument } from '@/entities/ui-node/validate';
import { useEditorStore } from '../model/editor-store';
import {
  addNode,
  newNode,
  moveNode,
  parentOf,
  removeNode,
  duplicateNode,
  pasteNode,
} from '../model/editor-commands';
import { RuntimeProvider } from '@/features/runtime/runtime-context';
import { RuntimeRenderer } from '@/features/runtime/runtime-renderer';
import { QueryPanel } from '@/features/data-sources/query-panel';
import { Palette, componentIcons } from './palette';
import { Canvas } from './canvas';
import { Layers } from './layers';
import { Inspector } from './inspector';
export function Editor({ appId }: { appId: string }) {
  const query = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api<AppData>(`/apps/${appId}`),
  });
  if (query.isLoading) return <Loading text="Getting your canvas ready…" />;
  if (query.error) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return <EditorSession key={appId} initial={query.data!} />;
}
interface Backup {
  document: UIDocument;
  revision: number;
}
interface Version {
  id: string;
  number: number;
  createdAt: string;
}
function EditorSession({ initial }: { initial: AppData }) {
  const [name, setName] = useState(initial.name);
  const [pages, setPages] = useState(initial.pages);
  const [queries, setQueries] = useState(initial.queries);
  const [pageId, setPageId] = useState(initial.pages[0]?.id ?? '');
  const [ready, setReady] = useState(false);
  const [leftTab, setLeftTab] = useState('components');
  const [mode, setMode] = useState('builder');
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [zoom, setZoom] = useState(100);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    'publish' | 'versions' | 'page' | 'rename-page' | 'rename-app' | null
  >(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<{ id: string; number: number } | null>(null);
  const document = useEditorStore((s) => s.document);
  const dirty = useEditorStore((s) => s.dirty);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const revision = useRef(initial.pages[0]?.revision ?? 0);
  const pending = useRef<Promise<void> | null>(null);
  const clipboard = useRef<{ document: UIDocument; id: string } | null>(null);
  const conflictRef = useRef(false);
  const initialized = useRef(false);
  const activePage = pages.find((p) => p.id === pageId);
  const key = `appsmith-draft:${initial.id}:${pageId}`;
  const versions = useQuery({
    queryKey: ['versions', initial.id],
    queryFn: () => api<Version[]>(`/apps/${initial.id}/versions`),
    enabled: dialog === 'versions',
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const page = initial.pages[0];
    if (!page) return;
    useEditorStore.getState().initialize(page.document);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const backup = JSON.parse(saved) as Backup;
        validateDocument(backup.document);
        if (backup.revision === page.revision) {
          useEditorStore.getState().commit(() => backup.document);
          toast.info('Your local draft has been restored.');
        } else {
          useEditorStore.getState().commit(() => backup.document);
          conflictRef.current = true;
          setConflict(true);
          setSaveError(
            'A local draft and the server version differ. Download your draft before reloading.',
          );
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
    setReady(true);
  }, [initial, key]);
  const save = useCallback(async () => {
    if (pending.current) await pending.current;
    const store = useEditorStore.getState();
    if (!store.dirty) return;
    if (conflictRef.current) throw new Error('Resolve the revision conflict before saving.');
    const toSave = store.document;
    setSaving(true);
    setSaveError('');
    const task = (async () => {
      try {
        const result = await api<{ revision: number }>(
          `/apps/${initial.id}/pages/${pageId}`,
          'PUT',
          { document: toSave, expectedRevision: revision.current },
        );
        revision.current = result.revision;
        setPages((p) =>
          p.map((page) =>
            page.id === pageId ? { ...page, document: toSave, revision: result.revision } : page,
          ),
        );
        useEditorStore.getState().markSaved(toSave);
        if (useEditorStore.getState().dirty)
          localStorage.setItem(
            key,
            JSON.stringify({
              document: useEditorStore.getState().document,
              revision: result.revision,
            }),
          );
        else localStorage.removeItem(key);
      } catch (e) {
        setSaveError((e as Error).message);
        if (e instanceof ApiError && e.status === 409) {
          conflictRef.current = true;
          setConflict(true);
        }
        throw e;
      } finally {
        setSaving(false);
      }
    })();
    pending.current = task;
    try {
      await task;
    } finally {
      pending.current = null;
    }
  }, [initial.id, pageId, key]);
  useEffect(() => {
    if (!ready || !dirty) return;
    localStorage.setItem(key, JSON.stringify({ document, revision: revision.current }));
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [document, dirty, key, ready, save]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, []);
  const switchPage = useCallback(
    async (id: string) => {
      if (id === pageId) return;
      try {
        await save();
        const page = pages.find((p) => p.id === id);
        if (!page) return;
        useEditorStore.getState().initialize(page.document);
        revision.current = page.revision;
        setPageId(id);
        setSaveError('');
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [pageId, pages, save],
  );
  function add(type: ComponentType, parentId?: string, index?: number) {
    try {
      const store = useEditorStore.getState();
      const selected = store.selectedId;
      const parent =
        parentId ??
        (selected && store.document.nodes[selected].type === 'Container'
          ? selected
          : selected
            ? parentOf(store.document, selected)
            : undefined) ??
        store.document.rootId;
      const node = newNode(type);
      store.commit((d) => addNode(d, parent, node, index));
      store.select(node.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const field =
        event.target instanceof HTMLElement &&
        !!event.target.closest('input,textarea,select,[contenteditable]');
      if (field || preview || mode !== 'builder') return;
      const ctrl = event.ctrlKey || event.metaKey;
      const store = useEditorStore.getState();
      const id = store.selectedId;
      try {
        if (ctrl && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (event.shiftKey) store.redo();
          else store.undo();
        }
        if (ctrl && event.key.toLowerCase() === 'y') {
          event.preventDefault();
          store.redo();
        }
        if (ctrl && event.key.toLowerCase() === 's') {
          event.preventDefault();
          void save().catch((e) => toast.error(e.message));
        }
        if (ctrl && event.key.toLowerCase() === 'c' && id && id !== store.document.rootId) {
          event.preventDefault();
          clipboard.current = { document: structuredClone(store.document), id };
          toast.success('Component copied');
        }
        if (ctrl && event.key.toLowerCase() === 'v' && clipboard.current) {
          event.preventDefault();
          const parent =
            id && store.document.nodes[id].type === 'Container'
              ? id
              : id
                ? (parentOf(store.document, id) ?? store.document.rootId)
                : store.document.rootId;
          const copied = clipboard.current;
          store.commit((d) => pasteNode(d, parent, copied.document, copied.id));
        }
        if (ctrl && event.key.toLowerCase() === 'd' && id && id !== store.document.rootId) {
          event.preventDefault();
          store.commit((d) => duplicateNode(d, id));
        }
        if (['Delete', 'Backspace'].includes(event.key) && id && id !== store.document.rootId) {
          event.preventDefault();
          store.commit((d) => removeNode(d, id));
        }
        if (event.key === 'Escape') {
          store.select(null);
        }
      } catch (e) {
        toast.error((e as Error).message);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [save, preview, mode]);
  function dragEnd(event: DragEndEvent) {
    setDragging(null);
    if (!event.over) return;
    const target = event.over.data.current as { parentId?: string; index?: number };
    if (!target.parentId) return;
    try {
      const source = String(event.active.id);
      if (source.startsWith('palette:'))
        add(source.slice(8) as ComponentType, target.parentId, target.index);
      else {
        useEditorStore
          .getState()
          .commit((d) => moveNode(d, source.slice(5), target.parentId!, target.index));
      }
    } catch {
      toast.error('This component cannot be moved here. Containers cannot contain themselves.');
    }
  }
  const navigate = useCallback(
    (id: string) => {
      void switchPage(id);
    },
    [switchPage],
  );
  async function publish() {
    setBusy(true);
    try {
      await save();
      const result = await api<{ id: string; number: number }>(
        `/apps/${initial.id}/publish`,
        'POST',
        {},
      );
      setPublished(result);
      toast.success(`Version ${result.number} is published`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitName() {
    setBusy(true);
    try {
      if (dialog === 'rename-app') {
        await api(`/apps/${initial.id}`, 'PATCH', { name: newName });
        setName(newName);
      }
      if (dialog === 'rename-page') {
        await api(`/apps/${initial.id}/pages/${pageId}`, 'PATCH', { name: newName });
        setPages((s) => s.map((p) => (p.id === pageId ? { ...p, name: newName } : p)));
      }
      if (dialog === 'page') {
        await save();
        const page = await api<PageData>(`/apps/${initial.id}/pages`, 'POST', { name: newName });
        setPages((s) => [...s, page]);
        useEditorStore.getState().initialize(page.document);
        revision.current = page.revision;
        setPageId(page.id);
      }
      setDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportDraft() {
    const blob = new Blob([JSON.stringify(useEditorStore.getState().document, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function reloadServer() {
    try {
      const page = await api<PageData>(`/apps/${initial.id}/pages/${pageId}`);
      localStorage.removeItem(key);
      useEditorStore.getState().initialize(page.document);
      revision.current = page.revision;
      setPages((s) => s.map((p) => (p.id === pageId ? page : p)));
      conflictRef.current = false;
      setConflict(false);
      setSaveError('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (!ready) return <Loading text="Restoring your canvas…" />;
  const DragIcon = dragging?.startsWith('palette:')
    ? componentIcons[dragging.slice(8) as ComponentType]
    : Layers3;
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <Link
          href={`/workspaces/${initial.workspaceId}`}
          className="editor-back"
          aria-label="Back to applications"
        >
          <ArrowLeft size={17} />
          <Logo compact />
        </Link>
        <div className="editor-app-title">
          <button
            onClick={() => {
              setNewName(name);
              setDialog('rename-app');
            }}
          >
            {name}
            <ChevronDown size={13} />
          </button>
          <span className="draft-label">{preview ? 'Preview' : 'Draft'}</span>
        </div>
        <div className={`save-indicator ${saveError ? 'save-failed' : ''}`}>
          {saving ? (
            <LoaderCircle className="spin" size={14} />
          ) : saveError ? (
            <Cloud size={14} />
          ) : (
            <Check size={14} />
          )}
          <span>
            {saving
              ? 'Saving…'
              : saveError
                ? 'Save failed'
                : dirty
                  ? 'Unsaved changes'
                  : 'All changes saved'}
          </span>
        </div>
        <div className="editor-header-actions">
          <button
            className="icon-btn"
            aria-label="Version history"
            onClick={() => setDialog('versions')}
          >
            <History size={18} />
          </button>
          <Button variant="secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? <ArrowLeft size={15} /> : <Eye size={15} />}{' '}
            {preview ? 'Back to editor' : 'Preview'}
          </Button>
          <Button
            disabled={initial.role !== 'OWNER'}
            title={initial.role !== 'OWNER' ? 'Only workspace owners can publish' : undefined}
            onClick={() => {
              setPublished(null);
              setDialog('publish');
            }}
          >
            <Globe size={15} />
            Publish
          </Button>
        </div>
      </header>
      {saveError && (
        <div className="save-error-banner" role="alert">
          <span>{saveError}</span>
          <button onClick={exportDraft}>
            <Download size={13} />
            Download draft
          </button>
          {conflict ? (
            <button onClick={reloadServer}>Reload server version</button>
          ) : (
            <button onClick={() => save().catch(() => {})}>Retry save</button>
          )}
        </div>
      )}
      {!preview && (
        <nav className="editor-navigation">
          <div>
            <button
              className={mode === 'builder' ? 'active' : ''}
              onClick={() => setMode('builder')}
            >
              <Layers3 size={15} />
              UI builder
            </button>
            <button
              className={mode === 'queries' ? 'active' : ''}
              onClick={() => setMode('queries')}
            >
              <Database size={15} />
              Queries<span>{queries.length}</span>
            </button>
          </div>
          <Link href="/guide">
            Builder guide
            <ExternalLink size={12} />
          </Link>
        </nav>
      )}
      {mode === 'queries' && !preview ? (
        <QueryPanel
          appId={initial.id}
          workspaceId={initial.workspaceId}
          queries={queries}
          onChange={setQueries}
        />
      ) : (
        <RuntimeProvider appId={initial.id} name={name} queryList={queries} onNavigate={navigate}>
          <DndContext
            sensors={sensors}
            collisionDetection={(args) => {
              const pointer = pointerWithin(args);
              return pointer.length
                ? pointer.sort((a, b) => {
                    const ar = args.droppableRects.get(a.id),
                      br = args.droppableRects.get(b.id);
                    return (
                      (ar ? ar.width * ar.height : Infinity) -
                      (br ? br.width * br.height : Infinity)
                    );
                  })
                : closestCenter(args);
            }}
            onDragStart={(e) => setDragging(String(e.active.id))}
            onDragEnd={dragEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className={`editor-body ${preview ? 'preview-body' : ''}`}>
              {!preview && (
                <aside className="editor-left">
                  <div className="left-tabs">
                    <button
                      className={leftTab === 'components' ? 'active' : ''}
                      onClick={() => setLeftTab('components')}
                    >
                      <Plus size={15} />
                      Components
                    </button>
                    <button
                      className={leftTab === 'layers' ? 'active' : ''}
                      onClick={() => setLeftTab('layers')}
                    >
                      <Layers3 size={15} />
                      Layers
                    </button>
                  </div>
                  {leftTab === 'components' ? <Palette onAdd={add} /> : <Layers />}
                  <div className="left-footer">
                    <kbd>⌘ / Ctrl</kbd>
                    <span>+ Z to undo</span>
                  </div>
                </aside>
              )}
              <main className="canvas-area">
                <div className="canvas-toolbar">
                  <div className="page-switch">
                    <span className="page-icon">
                      <Code2 size={14} />
                    </span>
                    <select
                      aria-label="Current page"
                      value={pageId}
                      onChange={(e) => void switchPage(e.target.value)}
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {!preview && (
                      <Menu label="Page actions">
                        <MenuItem
                          onSelect={() => {
                            setNewName('');
                            setDialog('page');
                          }}
                        >
                          <Plus size={14} />
                          Add page
                        </MenuItem>
                        <MenuItem
                          onSelect={() => {
                            setNewName(activePage?.name ?? '');
                            setDialog('rename-page');
                          }}
                        >
                          <Settings2 size={14} />
                          Rename page
                        </MenuItem>
                        {pages.length > 1 && (
                          <MenuItem
                            danger
                            onSelect={async () => {
                              try {
                                await save();
                                await api(`/apps/${initial.id}/pages/${pageId}`, 'DELETE');
                                const rest = pages.filter((p) => p.id !== pageId);
                                setPages(rest);
                                useEditorStore.getState().initialize(rest[0].document);
                                revision.current = rest[0].revision;
                                setPageId(rest[0].id);
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            Delete page
                          </MenuItem>
                        )}
                      </Menu>
                    )}
                  </div>
                  <div className="device-switch">
                    {[
                      ['desktop', Monitor],
                      ['tablet', Tablet],
                      ['mobile', Smartphone],
                    ].map(([value, Icon]) => {
                      const DeviceIcon = Icon as typeof Monitor;
                      return (
                        <button
                          key={String(value)}
                          aria-label={`${value} viewport`}
                          className={device === value ? 'active' : ''}
                          onClick={() => setDevice(String(value))}
                        >
                          <DeviceIcon size={16} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="history-controls">
                    {!preview && (
                      <>
                        <button
                          className="icon-btn"
                          disabled={!canUndo}
                          aria-label="Undo"
                          onClick={() => useEditorStore.getState().undo()}
                        >
                          <Undo2 size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          disabled={!canRedo}
                          aria-label="Redo"
                          onClick={() => useEditorStore.getState().redo()}
                        >
                          <Redo2 size={16} />
                        </button>
                        <span />
                      </>
                    )}
                    <button
                      className="zoom-label"
                      onClick={() => setZoom((z) => (z === 100 ? 75 : 100))}
                    >
                      {zoom}%<ChevronDown size={12} />
                    </button>
                  </div>
                </div>
                {preview && (
                  <div className="preview-note">
                    <Eye size={13} />
                    You’re viewing your draft. Try the buttons and connected data.
                  </div>
                )}
                <div
                  className="canvas-workspace"
                  onClick={() => !preview && useEditorStore.getState().select(null)}
                >
                  <div className={`canvas-frame ${device}`} style={{ zoom: zoom / 100 }}>
                    <div className="canvas-frame-label">
                      <span className="green-dot" />
                      {name}
                      <span>
                        {device === 'desktop' ? 'DESKTOP' : device.toUpperCase()} ·{' '}
                        {preview ? 'PREVIEW' : 'CANVAS'}
                      </span>
                    </div>
                    {preview ? <RuntimeRenderer document={document} /> : <Canvas />}
                  </div>
                </div>
                <footer className="canvas-status">
                  <span>
                    {preview ? (
                      <>
                        <Eye size={12} /> Interactive preview
                      </>
                    ) : (
                      <>
                        <Layers3 size={12} />
                        {Object.keys(document.nodes).length - 1} components
                      </>
                    )}
                  </span>
                  <span>
                    {device === 'desktop'
                      ? 'Responsive canvas'
                      : device === 'tablet'
                        ? '768 px'
                        : '375 px'}
                    <b>·</b>Revision {revision.current}
                  </span>
                  {!preview && (
                    <button onClick={() => save().catch((e) => toast.error(e.message))}>
                      <Save size={12} />
                      Save now
                    </button>
                  )}
                </footer>
              </main>
              {!preview && <Inspector queries={queries} pages={pages} />}
            </div>
            <DragOverlay>
              {dragging && (
                <div className="drag-overlay">
                  <DragIcon size={18} />
                  {dragging.startsWith('palette:') ? dragging.slice(8) : 'Move component'}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </RuntimeProvider>
      )}
      <Modal
        open={dialog !== null}
        onOpenChange={(v) => !v && setDialog(null)}
        title={
          dialog === 'publish'
            ? published
              ? 'Your app is live.'
              : 'Ready to put it to work?'
            : dialog === 'versions'
              ? 'Publication history'
              : dialog === 'page'
                ? 'A new page'
                : dialog === 'rename-page'
                  ? 'Rename page'
                  : 'Rename application'
        }
        description={
          dialog === 'publish'
            ? 'Publish a snapshot for your workspace. Future draft changes won’t affect this version.'
            : dialog === 'versions'
              ? 'Each publication is an independent snapshot of your app.'
              : 'Give it a name your team will recognize.'
        }
      >
        {dialog === 'publish' ? (
          published ? (
            <div className="publish-success">
              <span>
                <Check size={30} />
              </span>
              <p>Version {published.number} is ready for your team.</p>
              <Link className="btn btn-primary" href={`/run/${initial.id}`} target="_blank">
                Open published application
                <ExternalLink size={16} />
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`${location.origin}/run/${initial.id}`)
                    .then(() => toast.success('Link copied'));
                }}
              >
                <Copy size={15} />
                Copy link
              </Button>
              <small>Only members of this workspace can access it.</small>
            </div>
          ) : (
            <div className="publish-info">
              <div>
                <Globe size={24} />
                <strong>{name}</strong>
                <span>
                  {pages.length} pages · {queries.length} queries
                </span>
              </div>
              <p>
                We’ll save your draft and create a new version, including page documents and query
                settings.
              </p>
              <Button disabled={busy || conflict} onClick={publish}>
                {busy ? 'Publishing…' : 'Publish application'}
                <ArrowRight size={16} />
              </Button>
            </div>
          )
        ) : dialog === 'versions' ? (
          <div className="version-list">
            {versions.isLoading ? (
              <Loading text="Loading versions…" />
            ) : versions.error ? (
              <ErrorState error={versions.error} />
            ) : versions.data?.length ? (
              versions.data.map((v) => (
                <div key={v.id}>
                  <span>
                    <History size={17} />
                  </span>
                  <div>
                    <strong>Version {v.number}</strong>
                    <small>{new Date(v.createdAt).toLocaleString()}</small>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Download version ${v.number}`}
                    onClick={async () => {
                      const data = await api(`/apps/${initial.id}/versions/${v.id}`);
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
                      );
                      const a = window.document.createElement('a');
                      a.href = url;
                      a.download = `version-${v.number}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p>No publications yet. Publish your first version.</p>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitName();
            }}
          >
            <label className="field">
              Name
              <input
                required
                autoFocus
                maxLength={80}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={dialog === 'page' ? 'e.g. Orders' : 'Name'}
              />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button disabled={busy}>
                {busy ? 'Saving…' : dialog === 'page' ? 'Create page' : 'Save name'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

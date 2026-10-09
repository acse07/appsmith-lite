'use client';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Layers3 } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '../model/editor-store';
import { moveNode, parentOf } from '../model/editor-commands';
import { componentIcons } from './palette';
export function Layers() {
  const document = useEditorStore((s) => s.document);
  return (
    <div className="layers-panel">
      <div className="panel-title">
        <h3>Layers</h3>
        <Layers3 size={16} />
      </div>
      <p className="panel-description">A little structure goes a long way.</p>
      <Layer id={document.rootId} depth={0} />
    </div>
  );
}
function Layer({ id, depth }: { id: string; depth: number }) {
  const node = useEditorStore((s) => s.document.nodes[id]);
  const selected = useEditorStore((s) => s.selectedId === id);
  const [collapsed, setCollapsed] = useState(false);
  if (!node) return null;
  const Icon = componentIcons[node.type];
  function reorder(delta: number) {
    const store = useEditorStore.getState();
    const parent = parentOf(store.document, id);
    if (!parent) return;
    const siblings = store.document.nodes[parent].children;
    const index = siblings.indexOf(id) + delta;
    if (index < 0 || index >= siblings.length) return;
    store.commit((d) => moveNode(d, id, parent, index));
  }
  return (
    <div>
      <div
        className={`layer-row ${selected ? 'selected' : ''}`}
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        <button
          className="layer-collapse"
          aria-label={collapsed ? 'Expand layer' : 'Collapse layer'}
          onClick={() => setCollapsed((v) => !v)}
        >
          {node.children.length ? (
            collapsed ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronDown size={12} />
            )
          ) : (
            <span />
          )}
        </button>
        <button className="layer-select" onClick={() => useEditorStore.getState().select(id)}>
          <Icon size={14} />
          <span>
            {depth === 0
              ? 'Page container'
              : String(node.props.label ?? node.props.text ?? node.type).slice(0, 22)}
          </span>
        </button>
        {selected && depth > 0 && (
          <div className="layer-order">
            <button onClick={() => reorder(-1)} aria-label="Move layer up">
              <ArrowUp size={12} />
            </button>
            <button onClick={() => reorder(1)} aria-label="Move layer down">
              <ArrowDown size={12} />
            </button>
          </div>
        )}
      </div>
      {!collapsed &&
        node.children.map((child) => <Layer key={child} id={child} depth={depth + 1} />)}
    </div>
  );
}

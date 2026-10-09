'use client';
import { memo, type ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, Plus, MousePointer2 } from 'lucide-react';
import { useEditorStore } from '../model/editor-store';
import { NodeContent } from '@/features/runtime/node-content';
export function Canvas() {
  const rootId = useEditorStore((s) => s.document.rootId);
  return (
    <div className="editor-canvas" data-testid="canvas">
      <CanvasNode id={rootId} />
    </div>
  );
}
const CanvasNode = memo(function CanvasNode({ id }: { id: string }) {
  const node = useEditorStore((s) => s.document.nodes[id]);
  const selected = useEditorStore((s) => s.selectedId === id);
  const isRoot = useEditorStore((s) => s.document.rootId === id);
  const drag = useDraggable({ id: `node:${id}`, data: { nodeId: id }, disabled: isRoot });
  const drop = useDroppable({
    id: `inside:${id}`,
    data: { parentId: id },
    disabled: node?.type !== 'Container',
  });
  if (!node) return null;
  const children: ReactNode[] = [];
  for (let i = 0; i <= node.children.length; i++) {
    children.push(<DropSlot key={`slot-${i}`} parentId={id} index={i} />);
    if (i < node.children.length)
      children.push(<CanvasNode key={node.children[i]} id={node.children[i]} />);
  }
  return (
    <div
      ref={(element) => {
        drag.setNodeRef(element);
        drop.setNodeRef(element);
      }}
      className={`canvas-node ${node.type.toLowerCase()} ${selected ? 'node-selected' : ''} ${drop.isOver ? 'drop-active' : ''} ${drag.isDragging ? 'node-dragging' : ''} ${isRoot ? 'canvas-root' : ''}`}
      style={{ flex: node.props.width === 'full' ? '1 1 0%' : undefined }}
      data-node-id={id}
      onClick={(e) => {
        e.stopPropagation();
        useEditorStore.getState().select(id);
      }}
      role="group"
      aria-label={`${node.type} component`}
    >
      {selected && (
        <div className="node-label">
          <span>{node.type}</span>
          {!isRoot && (
            <button
              ref={drag.setActivatorNodeRef}
              {...drag.listeners}
              {...drag.attributes}
              aria-label={`Drag ${node.type}`}
            >
              <GripVertical size={12} />
            </button>
          )}
        </div>
      )}
      <NodeContent node={node} interactive={false}>
        {children}
        {node.type === 'Container' && !node.children.length && (
          <div className="canvas-empty">
            <span>
              <Plus size={24} />
            </span>
            <strong>Your canvas, your possibilities.</strong>
            <p>Drop a component here to get started.</p>
            <small>
              <MousePointer2 size={12} /> Or click a component in the left panel
            </small>
          </div>
        )}
      </NodeContent>
    </div>
  );
});
function DropSlot({ parentId, index }: { parentId: string; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${parentId}:${index}`,
    data: { parentId, index },
  });
  return (
    <div ref={setNodeRef} className={`drop-slot ${isOver ? 'over' : ''}`}>
      <span />
    </div>
  );
}

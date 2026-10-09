'use client';
import { memo } from 'react';
import type { UIDocument } from '@/entities/ui-node/types';
import { NodeContent } from './node-content';
export const RuntimeRenderer = memo(function RuntimeRenderer({
  document,
}: {
  document: UIDocument;
}) {
  function render(id: string): React.ReactNode {
    const node = document.nodes[id];
    return node ? (
      <NodeContent key={id} node={node}>
        {node.children.map(render)}
      </NodeContent>
    ) : null;
  }
  return <div className="runtime-renderer">{render(document.rootId)}</div>;
});

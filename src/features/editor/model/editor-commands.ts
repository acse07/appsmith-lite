import { produce } from 'immer';
import { registry } from '@/features/component-registry/registry';
import { validateDocument } from '@/entities/ui-node/validate';
import type { ComponentType, UIDocument, UINode } from '@/entities/ui-node/types';
export function newNode(type: ComponentType): UINode {
  return {
    id: crypto.randomUUID(),
    type,
    props: structuredClone(registry[type].defaultProps),
    children: [],
  };
}
export function emptyDocument(): UIDocument {
  return {
    schemaVersion: 1,
    rootId: 'root',
    nodes: {
      root: {
        id: 'root',
        type: 'Container',
        props: { direction: 'column', gap: 20, padding: 32, background: '#ffffff' },
        children: [],
      },
    },
  };
}
export function parentOf(doc: UIDocument, id: string) {
  return Object.values(doc.nodes).find((n) => n.children.includes(id))?.id;
}
function checked(doc: UIDocument) {
  validateDocument(doc);
  return doc;
}
export function addNode(doc: UIDocument, parentId: string, node: UINode, index?: number) {
  return checked(
    produce(doc, (d) => {
      if (d.nodes[node.id]) throw new Error('ID already exists');
      d.nodes[node.id] = node;
      d.nodes[parentId].children.splice(index ?? d.nodes[parentId].children.length, 0, node.id);
    }),
  );
}
export function removeNode(doc: UIDocument, id: string) {
  if (id === doc.rootId) throw new Error('The root cannot be removed');
  return checked(
    produce(doc, (d) => {
      const parent = parentOf(d, id);
      if (!parent) throw new Error('Node not found');
      d.nodes[parent].children = d.nodes[parent].children.filter((c) => c !== id);
      function remove(key: string) {
        for (const child of d.nodes[key].children) remove(child);
        delete d.nodes[key];
      }
      remove(id);
    }),
  );
}
export function moveNode(doc: UIDocument, id: string, parentId: string, index?: number) {
  if (id === doc.rootId) throw new Error('The root cannot be moved');
  return checked(
    produce(doc, (d) => {
      const old = parentOf(d, id);
      if (!old) throw new Error('Node not found');
      d.nodes[old].children = d.nodes[old].children.filter((c) => c !== id);
      d.nodes[parentId].children.splice(index ?? d.nodes[parentId].children.length, 0, id);
    }),
  );
}
export function updateNodeProps(doc: UIDocument, id: string, patch: Record<string, unknown>) {
  return checked(
    produce(doc, (d) => {
      Object.assign(d.nodes[id].props, patch);
    }),
  );
}
export function updateNodeEvents(doc: UIDocument, id: string, events: UINode['events']) {
  return checked(
    produce(doc, (d) => {
      d.nodes[id].events = events;
    }),
  );
}
export function pasteNode(
  doc: UIDocument,
  parentId: string,
  source: UIDocument,
  sourceId: string,
  index?: number,
) {
  return checked(
    produce(doc, (d) => {
      function copy(key: string): string {
        const n = source.nodes[key];
        const id = crypto.randomUUID();
        d.nodes[id] = { ...structuredClone(n), id, children: n.children.map(copy) };
        return id;
      }
      d.nodes[parentId].children.splice(
        index ?? d.nodes[parentId].children.length,
        0,
        copy(sourceId),
      );
    }),
  );
}
export function duplicateNode(doc: UIDocument, id: string) {
  const parent = parentOf(doc, id);
  if (!parent) throw new Error('The root cannot be duplicated');
  return pasteNode(doc, parent, doc, id, doc.nodes[parent].children.indexOf(id) + 1);
}

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  duplicateNode,
  emptyDocument,
  moveNode,
  newNode,
  removeNode,
  updateNodeProps,
} from '@/features/editor/model/editor-commands';
import { validateDocument } from '@/entities/ui-node/validate';
import { useEditorStore } from '@/features/editor/model/editor-store';
describe('editor document commands', () => {
  it('adds a component without mutating the input', () => {
    const original = emptyDocument();
    const node = newNode('Heading');
    const result = addNode(original, 'root', node);
    expect(result.nodes.root.children).toEqual([node.id]);
    expect(original.nodes.root.children).toEqual([]);
  });
  it('removes the complete subtree', () => {
    const c = newNode('Container');
    const text = newNode('Text');
    let doc = addNode(emptyDocument(), 'root', c);
    doc = addNode(doc, c.id, text);
    const result = removeNode(doc, c.id);
    expect(Object.keys(result.nodes)).toEqual(['root']);
  });
  it('moves a component between containers without duplication', () => {
    const c = newNode('Container');
    const text = newNode('Text');
    let doc = addNode(emptyDocument(), 'root', c);
    doc = addNode(doc, 'root', text);
    const moved = moveNode(doc, text.id, c.id);
    expect(moved.nodes.root.children).toEqual([c.id]);
    expect(moved.nodes[c.id].children).toEqual([text.id]);
    expect(Object.keys(moved.nodes)).toHaveLength(3);
  });
  it('sorts siblings', () => {
    const a = newNode('Text'),
      b = newNode('Button');
    const doc = addNode(addNode(emptyDocument(), 'root', a), 'root', b);
    expect(moveNode(doc, a.id, 'root', 1).nodes.root.children).toEqual([b.id, a.id]);
  });
  it('rejects moving a container into its descendant', () => {
    const a = newNode('Container'),
      b = newNode('Container');
    const doc = addNode(addNode(emptyDocument(), 'root', a), a.id, b);
    expect(() => moveNode(doc, a.id, b.id)).toThrow();
    expect(doc.nodes.root.children).toEqual([a.id]);
  });
  it('duplicates with new IDs throughout a subtree', () => {
    const a = newNode('Container'),
      b = newNode('Text');
    const doc = addNode(addNode(emptyDocument(), 'root', a), a.id, b);
    const result = duplicateNode(doc, a.id);
    const copy = result.nodes.root.children[1];
    expect(copy).not.toBe(a.id);
    expect(result.nodes[copy].children[0]).not.toBe(b.id);
    expect(result.nodes[result.nodes[copy].children[0]].props).toEqual(b.props);
    expect(Object.keys(result.nodes)).toHaveLength(5);
  });
  it('does not allow children inside leaf nodes', () => {
    const a = newNode('Button');
    const doc = addNode(emptyDocument(), 'root', a);
    expect(() => addNode(doc, a.id, newNode('Text'))).toThrow('Invalid child');
  });
  it('rejects incompatible properties', () => {
    const a = newNode('Button');
    const doc = addNode(emptyDocument(), 'root', a);
    expect(() => updateNodeProps(doc, a.id, { disabled: 'yes' })).toThrow();
  });
  it('protects the document root', () => {
    const doc = emptyDocument();
    expect(() => removeNode(doc, 'root')).toThrow();
    expect(() => moveNode(doc, 'root', 'root')).toThrow();
  });
});
describe('document invariants', () => {
  it('rejects an unsupported schema version', () => {
    expect(() => validateDocument({ ...emptyDocument(), schemaVersion: 2 })).toThrow();
  });
  it('detects cycles', () => {
    const doc = emptyDocument();
    doc.nodes.root.children = ['root'];
    expect(() => validateDocument(doc)).toThrow('Cycle');
  });
  it('detects missing children', () => {
    const doc = emptyDocument();
    doc.nodes.root.children = ['missing'];
    expect(() => validateDocument(doc)).toThrow('Invalid child');
  });
  it('detects orphans', () => {
    const doc = emptyDocument();
    doc.nodes.orphan = { ...newNode('Text'), id: 'orphan' };
    expect(() => validateDocument(doc)).toThrow('Orphan');
  });
  it('detects multiple parents', () => {
    const a = newNode('Text');
    const doc = addNode(emptyDocument(), 'root', a);
    const broken = structuredClone(doc);
    broken.nodes.root.children.push(a.id);
    expect(() => validateDocument(broken)).toThrow('multiple parents');
  });
});
describe('editor history', () => {
  beforeEach(() => useEditorStore.getState().initialize(emptyDocument()));
  it('undo restores the previous document and redo reapplies it', () => {
    const node = newNode('Text');
    useEditorStore.getState().commit((d) => addNode(d, 'root', node));
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().document.nodes[node.id]).toBeUndefined();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().document.nodes[node.id]).toEqual(node);
  });
  it('selection does not affect history or dirty state', () => {
    useEditorStore.getState().select('root');
    expect(useEditorStore.getState().past).toHaveLength(0);
    expect(useEditorStore.getState().dirty).toBe(false);
  });
  it('new changes clear redo history', () => {
    useEditorStore.getState().commit((d) => addNode(d, 'root', newNode('Text')));
    useEditorStore.getState().undo();
    useEditorStore.getState().commit((d) => addNode(d, 'root', newNode('Button')));
    expect(useEditorStore.getState().future).toHaveLength(0);
  });
  it('limits history to 50 document changes', () => {
    for (let i = 0; i < 60; i++)
      useEditorStore.getState().commit((d) => updateNodeProps(d, 'root', { gap: i }));
    expect(useEditorStore.getState().past).toHaveLength(50);
  });
  it('a completed save does not discard newer unsaved changes', () => {
    const saved = useEditorStore.getState().document;
    useEditorStore.getState().commit((d) => addNode(d, 'root', newNode('Text')));
    useEditorStore.getState().markSaved(saved);
    expect(useEditorStore.getState().dirty).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { Palette } from '@/features/editor/components/palette';
import { Inspector } from '@/features/editor/components/inspector';
import { Canvas } from '@/features/editor/components/canvas';
import { RuntimeProvider } from '@/features/runtime/runtime-context';
import { RuntimeRenderer } from '@/features/runtime/runtime-renderer';
import { DataTable } from '@/features/runtime/node-content';
import { ErrorState } from '@/shared/ui/primitives';
import { emptyDocument, addNode, newNode } from '@/features/editor/model/editor-commands';
import { useEditorStore } from '@/features/editor/model/editor-store';
import { toast } from 'sonner';
import { Profiler } from 'react';
import { NodeContent } from '@/features/runtime/node-content';
import * as apiModule from '@/shared/lib/api';
import { queryConfigSchema } from '@/entities/ui-node/types';
describe('editor components', () => {
  beforeEach(() => useEditorStore.getState().initialize(emptyDocument()));
  it('palette lists and filters components', () => {
    const add = vi.fn();
    render(
      <DndContext>
        <Palette onAdd={add} />
      </DndContext>,
    );
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Find a component'), { target: { value: 'Heading' } });
    expect(screen.queryByRole('button', { name: 'Table' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }));
    expect(add).toHaveBeenCalledWith('Heading');
  });
  it('inspector updates the selected node', () => {
    const node = newNode('Heading');
    useEditorStore.getState().initialize(addNode(emptyDocument(), 'root', node));
    useEditorStore.getState().select(node.id);
    render(<Inspector queries={[]} pages={[]} />);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Customer directory' } });
    expect(useEditorStore.getState().document.nodes[node.id].props.text).toBe('Customer directory');
    expect(useEditorStore.getState().past).toHaveLength(1);
  });
  it('canvas selection targets the clicked node', () => {
    const node = newNode('Heading');
    useEditorStore.getState().initialize(addNode(emptyDocument(), 'root', node));
    render(
      <RuntimeProvider appId="app" name="Demo" queryList={[]} onNavigate={() => {}}>
        <DndContext>
          <Canvas />
        </DndContext>
      </RuntimeProvider>,
    );
    fireEvent.click(screen.getByText('Your next great idea'));
    expect(useEditorStore.getState().selectedId).toBe(node.id);
  });
  it('table renders rows and selection', () => {
    const select = vi.fn();
    render(
      <DataTable
        data={[{ id: 1, name: 'Alex', email: 'alex@example.com' }]}
        columns={['name', 'email']}
        pagination
        pageSize={5}
        onSelect={select}
      />,
    );
    fireEvent.click(screen.getByText('Alex'));
    expect(select).toHaveBeenCalledWith({ id: 1, name: 'Alex', email: 'alex@example.com' });
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });
  it('shows an API error state', () => {
    render(<ErrorState error={new Error('Source unavailable')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Source unavailable');
  });
  it('runtime button executes its event without editor controls', () => {
    const spy = vi.spyOn(toast, 'success').mockImplementation(() => 0);
    const node = newNode('Button');
    node.events = { onClick: { type: 'showToast', message: 'It works' } };
    render(
      <RuntimeProvider appId="app" name="Demo" queryList={[]} onNavigate={() => {}}>
        <RuntimeRenderer document={addNode(emptyDocument(), 'root', node)} />
      </RuntimeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(spy).toHaveBeenCalledWith('It works');
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    spy.mockRestore();
  });
  it('input bindings update while an independent heading does not render again', () => {
    const input = newNode('Input'),
      heading = newNode('Heading'),
      text = newNode('Text');
    text.props.text = { kind: 'binding', path: `inputs.${input.id}.value` };
    const count = vi.fn();
    render(
      <RuntimeProvider appId="app" name="Demo" queryList={[]} onNavigate={() => {}}>
        <NodeContent node={input} />
        <Profiler id="static-heading" onRender={count}>
          <NodeContent node={heading} />
        </Profiler>
        <NodeContent node={text} />
      </RuntimeProvider>,
    );
    const initial = count.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Latest input' } });
    expect(screen.getByText('Latest input')).toBeInTheDocument();
    expect(count.mock.calls.length).toBe(initial);
  });
  it('query body bindings use the latest input value', () => {
    const request = vi.spyOn(apiModule, 'api').mockResolvedValue({ id: 1 });
    const input = newNode('Input'),
      button = newNode('Button');
    button.events = { onClick: { type: 'runQuery', queryId: 'q' } };
    const queries = [
      {
        id: 'q',
        name: 'createCustomer',
        sourceId: 'source',
        config: queryConfigSchema.parse({
          method: 'POST',
          resource: 'customers',
          body: { name: { kind: 'binding', path: `inputs.${input.id}.value` } },
          runOnLoad: false,
        }),
      },
    ];
    render(
      <RuntimeProvider appId="app" name="Demo" queryList={queries} onNavigate={() => {}}>
        <NodeContent node={input} />
        <NodeContent node={button} />
      </RuntimeProvider>,
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(request).toHaveBeenCalledWith('/apps/app/queries/q/execute', 'POST', {
      values: { name: 'Alex' },
    });
    request.mockRestore();
  });
  it('default input values participate in bindings and reset', () => {
    const input = newNode('Input'),
      text = newNode('Text'),
      button = newNode('Button');
    input.props.defaultValue = 'Default name';
    text.props.text = { kind: 'binding', path: `inputs.${input.id}.value` };
    button.events = { onClick: { type: 'resetForm' } };
    render(
      <RuntimeProvider appId="app" name="Demo" queryList={[]} onNavigate={() => {}}>
        <NodeContent node={input} />
        <NodeContent node={text} />
        <NodeContent node={button} />
      </RuntimeProvider>,
    );
    expect(screen.getByText('Default name')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed name' } });
    expect(screen.getByText('Changed name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(screen.getByText('Default name')).toBeInTheDocument();
  });
  it('large tables expose later rows through a bounded render window', () => {
    const data = Array.from({ length: 1000 }, (_, id) => ({ id, name: `Person ${id}` }));
    const { container } = render(
      <DataTable
        data={data}
        columns={['name']}
        pagination={false}
        pageSize={5}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Person 0')).toBeInTheDocument();
    expect(screen.queryByText('Person 500')).not.toBeInTheDocument();
    fireEvent.scroll(container.querySelector('.table-scroll')!, {
      target: { scrollTop: 500 * 52 + 38 },
    });
    expect(screen.getByText('Person 500')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(25);
  });
});

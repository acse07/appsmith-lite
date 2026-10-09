import { describe, expect, it, vi } from 'vitest';
import { resolveBinding, type RuntimeContext } from '@/features/bindings/resolve';
import { executeAction, type ActionHandlers } from '@/features/actions/execute';
const context: RuntimeContext = {
  app: { name: 'Customers' },
  queries: { getCustomers: { data: [{ name: 'Alex' }], isLoading: false } },
  state: {},
  inputs: {},
};
describe('safe bindings', () => {
  it('resolves approved paths', () => {
    expect(resolveBinding({ kind: 'binding', path: 'app.name' }, context)).toBe('Customers');
    expect(resolveBinding({ kind: 'binding', path: 'queries.getCustomers.data' }, context)).toEqual(
      [{ name: 'Alex' }],
    );
  });
  it('handles missing values', () => {
    expect(
      resolveBinding({ kind: 'binding', path: 'state.selectedCustomer.name' }, context),
    ).toBeUndefined();
  });
  it('rejects prototype traversal', () => {
    expect(() => resolveBinding({ kind: 'binding', path: 'app.__proto__.name' }, context)).toThrow(
      'Unsafe',
    );
  });
  it('rejects unsupported roots and executable expressions', () => {
    expect(() => resolveBinding({ kind: 'binding', path: 'window.location' }, context)).toThrow();
    expect(() =>
      resolveBinding({ kind: 'binding', path: 'app.name.toUpperCase()' }, context),
    ).toThrow();
  });
  it('returns static properties unchanged', () => {
    expect(resolveBinding('hello', context)).toBe('hello');
    expect(resolveBinding(false, context)).toBe(false);
  });
});
describe('registered action engine', () => {
  const handlers = (): ActionHandlers => ({
    runQuery: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    showToast: vi.fn(),
    setValue: vi.fn(),
    resetForm: vi.fn(),
  });
  it('runs a named query', async () => {
    const h = handlers();
    await executeAction({ type: 'runQuery', queryId: 'q1' }, context, h);
    expect(h.runQuery).toHaveBeenCalledWith('q1');
  });
  it('resolves set-value bindings', async () => {
    const h = handlers();
    await executeAction(
      { type: 'setValue', key: 'title', value: { kind: 'binding', path: 'app.name' } },
      context,
      h,
    );
    expect(h.setValue).toHaveBeenCalledWith('title', 'Customers');
  });
  it('dispatches navigation, toast and reset actions', async () => {
    const h = handlers();
    await executeAction({ type: 'navigate', pageId: 'p2' }, context, h);
    await executeAction({ type: 'showToast', message: 'Saved' }, context, h);
    await executeAction({ type: 'resetForm' }, context, h);
    expect(h.navigate).toHaveBeenCalledWith('p2');
    expect(h.showToast).toHaveBeenCalledWith('Saved');
    expect(h.resetForm).toHaveBeenCalledOnce();
  });
});

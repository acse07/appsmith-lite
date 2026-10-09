import type { ActionConfig } from '@/entities/ui-node/types';
import { resolveBinding, type RuntimeContext } from '@/features/bindings/resolve';
export interface ActionHandlers {
  runQuery: (id: string) => Promise<void>;
  navigate: (id: string) => void;
  showToast: (message: string) => void;
  setValue: (key: string, value: unknown) => void;
  resetForm: () => void;
}
export async function executeAction(
  action: ActionConfig,
  context: RuntimeContext,
  handlers: ActionHandlers,
) {
  switch (action.type) {
    case 'runQuery':
      await handlers.runQuery(action.queryId);
      break;
    case 'navigate':
      handlers.navigate(action.pageId);
      break;
    case 'showToast':
      handlers.showToast(action.message);
      break;
    case 'setValue':
      handlers.setValue(action.key, resolveBinding(action.value, context));
      break;
    case 'resetForm':
      handlers.resetForm();
      break;
  }
}

import { z } from 'zod';
import { bindingSchema, type ComponentType } from '@/entities/ui-node/types';
export interface PropertyField {
  key: string;
  label: string;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'json';
  group: 'content' | 'style';
  options?: string[];
  min?: number;
  max?: number;
}
interface Definition {
  render: ComponentType;
  displayName: string;
  description: string;
  category: string;
  defaultProps: Record<string, unknown>;
  propsSchema: z.ZodType;
  allowedChildren: ComponentType[];
  events: string[];
  fields: PropertyField[];
}
const text = z.union([z.string().max(10000), bindingSchema]);
const bool = z.union([z.boolean(), bindingSchema]);
const color = z.string().regex(/^(#[0-9a-fA-F]{3,8}|transparent)$/);
const common = { width: z.enum(['auto', 'full']).optional(), background: color.optional() };
const f = (
  key: string,
  label: string,
  kind: PropertyField['kind'] = 'string',
  group: PropertyField['group'] = 'content',
  options?: string[],
  min?: number,
  max?: number,
): PropertyField => ({ key, label, kind, group, options, min, max });
const styles = [
  f('width', 'Width', 'enum', 'style', ['auto', 'full']),
  f('background', 'Background', 'color', 'style'),
];
export const registry: Record<ComponentType, Definition> = {
  Container: {
    render: 'Container',
    displayName: 'Container',
    description: 'Group and arrange elements',
    category: 'Layout',
    defaultProps: {
      direction: 'column',
      gap: 16,
      padding: 24,
      background: '#ffffff',
      width: 'full',
    },
    propsSchema: z
      .object({
        ...common,
        direction: z.enum(['row', 'column']).optional(),
        gap: z.number().min(0).max(100).optional(),
        padding: z.number().min(0).max(100).optional(),
      })
      .strict(),
    allowedChildren: [
      'Container',
      'Text',
      'Heading',
      'Button',
      'Input',
      'Select',
      'Table',
      'Divider',
    ],
    events: [],
    fields: [
      f('direction', 'Direction', 'enum', 'style', ['row', 'column']),
      f('gap', 'Gap', 'number', 'style', undefined, 0, 100),
      f('padding', 'Padding', 'number', 'style', undefined, 0, 100),
      ...styles,
    ],
  },
  Text: {
    render: 'Text',
    displayName: 'Text',
    description: 'Paragraphs and descriptions',
    category: 'Basic',
    defaultProps: {
      text: 'Add a little context to your app.',
      fontSize: 14,
      color: '#64748b',
      bold: false,
    },
    propsSchema: z
      .object({
        ...common,
        text: text.optional(),
        fontSize: z.number().min(10).max(80).optional(),
        color: color.optional(),
        bold: z.boolean().optional(),
      })
      .strict(),
    allowedChildren: [],
    events: [],
    fields: [
      f('text', 'Text'),
      f('fontSize', 'Font size', 'number', 'style', undefined, 10, 80),
      f('color', 'Text color', 'color', 'style'),
      f('bold', 'Bold', 'boolean', 'style'),
      ...styles,
    ],
  },
  Heading: {
    render: 'Heading',
    displayName: 'Heading',
    description: 'Give your section a title',
    category: 'Basic',
    defaultProps: { text: 'Your next great idea', level: 2, color: '#17212f' },
    propsSchema: z
      .object({
        ...common,
        text: text.optional(),
        level: z.number().int().min(1).max(6).optional(),
        color: color.optional(),
      })
      .strict(),
    allowedChildren: [],
    events: [],
    fields: [
      f('text', 'Text'),
      f('level', 'Heading level', 'number', 'content', undefined, 1, 6),
      f('color', 'Text color', 'color', 'style'),
      ...styles,
    ],
  },
  Button: {
    render: 'Button',
    displayName: 'Button',
    description: 'Trigger queries and actions',
    category: 'Basic',
    defaultProps: { label: 'Click me', variant: 'primary', size: 'medium', disabled: false },
    propsSchema: z
      .object({
        ...common,
        label: text.optional(),
        variant: z.enum(['primary', 'secondary', 'outline']).optional(),
        size: z.enum(['small', 'medium', 'large']).optional(),
        disabled: bool.optional(),
      })
      .strict(),
    allowedChildren: [],
    events: ['onClick'],
    fields: [
      f('label', 'Label'),
      f('variant', 'Variant', 'enum', 'content', ['primary', 'secondary', 'outline']),
      f('size', 'Size', 'enum', 'style', ['small', 'medium', 'large']),
      f('disabled', 'Disabled', 'boolean'),
      ...styles,
    ],
  },
  Input: {
    render: 'Input',
    displayName: 'Input',
    description: 'Collect text from your users',
    category: 'Inputs',
    defaultProps: {
      label: 'Name',
      placeholder: 'Enter a value',
      required: false,
      inputType: 'text',
    },
    propsSchema: z
      .object({
        ...common,
        label: text.optional(),
        placeholder: z.string().max(200).optional(),
        required: z.boolean().optional(),
        inputType: z.enum(['text', 'email', 'number', 'password']).optional(),
        defaultValue: text.optional(),
      })
      .strict(),
    allowedChildren: [],
    events: ['onChange'],
    fields: [
      f('label', 'Label'),
      f('placeholder', 'Placeholder'),
      f('inputType', 'Input type', 'enum', 'content', ['text', 'email', 'number', 'password']),
      f('required', 'Required', 'boolean'),
      f('defaultValue', 'Default value'),
      ...styles,
    ],
  },
  Select: {
    render: 'Select',
    displayName: 'Select',
    description: 'Choose from a list of options',
    category: 'Inputs',
    defaultProps: {
      label: 'Status',
      options: ['Active', 'Pending', 'Inactive'],
      defaultValue: 'Active',
    },
    propsSchema: z
      .object({
        ...common,
        label: text.optional(),
        options: z.array(z.string().max(200)).max(100).optional(),
        defaultValue: text.optional(),
      })
      .strict(),
    allowedChildren: [],
    events: ['onChange'],
    fields: [
      f('label', 'Label'),
      f('options', 'Options (JSON)', 'json'),
      f('defaultValue', 'Default value'),
      ...styles,
    ],
  },
  Table: {
    render: 'Table',
    displayName: 'Table',
    description: 'Explore and select your data',
    category: 'Data',
    defaultProps: {
      columns: ['name', 'email', 'company', 'status'],
      data: { kind: 'binding', path: 'queries.getCustomers.data' },
      pagination: true,
      pageSize: 5,
    },
    propsSchema: z
      .object({
        ...common,
        columns: z.array(z.string().max(100)).max(30).optional(),
        data: z
          .union([z.array(z.record(z.string(), z.unknown())).max(1000), bindingSchema])
          .optional(),
        pagination: z.boolean().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      })
      .strict(),
    allowedChildren: [],
    events: ['onRowSelect'],
    fields: [
      f('columns', 'Columns (JSON)', 'json'),
      f('data', 'Data (JSON or binding)', 'json'),
      f('pagination', 'Pagination', 'boolean'),
      f('pageSize', 'Rows per page', 'number', 'content', undefined, 1, 100),
      ...styles,
    ],
  },
  Divider: {
    render: 'Divider',
    displayName: 'Divider',
    description: 'Separate your sections',
    category: 'Layout',
    defaultProps: { thickness: 1, color: '#e8ecf0' },
    propsSchema: z
      .object({
        ...common,
        thickness: z.number().min(1).max(10).optional(),
        color: color.optional(),
      })
      .strict(),
    allowedChildren: [],
    events: [],
    fields: [
      f('thickness', 'Thickness', 'number', 'style', undefined, 1, 10),
      f('color', 'Color', 'color', 'style'),
      ...styles,
    ],
  },
};

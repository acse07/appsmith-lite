import { emptyDocument, newNode, addNode } from '@/features/editor/model/editor-commands';
import type { UIDocument } from '@/entities/ui-node/types';
export const customers = [
  {
    id: 1,
    name: 'Olivia Rhye',
    email: 'olivia@acme.com',
    company: 'Acme Inc.',
    status: 'Active',
    revenue: '$12,450',
  },
  {
    id: 2,
    name: 'Phoenix Baker',
    email: 'phoenix@layers.com',
    company: 'Layers',
    status: 'Active',
    revenue: '$8,200',
  },
  {
    id: 3,
    name: 'Lana Steiner',
    email: 'lana@sisyphus.com',
    company: 'Sisyphus',
    status: 'Pending',
    revenue: '$5,680',
  },
  {
    id: 4,
    name: 'Demi Wilkinson',
    email: 'demi@catalog.com',
    company: 'Catalog',
    status: 'Active',
    revenue: '$16,900',
  },
  {
    id: 5,
    name: 'Drew Cano',
    email: 'drew@circooles.com',
    company: 'Circooles',
    status: 'Inactive',
    revenue: '$3,750',
  },
  {
    id: 6,
    name: 'Natali Craig',
    email: 'natali@hourglass.com',
    company: 'Hourglass',
    status: 'Active',
    revenue: '$9,320',
  },
  {
    id: 7,
    name: 'Andi Lane',
    email: 'andi@command.com',
    company: 'Command+R',
    status: 'Pending',
    revenue: '$6,480',
  },
];
export function customerDocument(queryId?: string): UIDocument {
  let doc = emptyDocument();
  for (const [type, props] of [
    ['Text', { text: 'CUSTOMER OPERATIONS', fontSize: 11, color: '#d46535', bold: true }],
    ['Heading', { text: 'Customer overview', level: 1, color: '#17212f' }],
    [
      'Text',
      {
        text: 'A little more clarity. A lot better customer relationships.',
        fontSize: 14,
        color: '#64748b',
      },
    ],
    ['Divider', { thickness: 1, color: '#e8ecf0' }],
  ] as const) {
    const node = newNode(type);
    node.props = { ...node.props, ...props };
    doc = addNode(doc, 'root', node);
  }
  const row = newNode('Container');
  row.props = { direction: 'row', gap: 16, padding: 0, background: 'transparent', width: 'full' };
  doc = addNode(doc, 'root', row);
  const input = newNode('Input');
  input.props = {
    label: 'Customer name',
    placeholder: 'e.g. Alex Morgan',
    required: true,
    inputType: 'text',
    width: 'full',
  };
  doc = addNode(doc, row.id, input);
  const email = newNode('Input');
  email.props = {
    label: 'Email address',
    placeholder: 'alex@company.com',
    required: true,
    inputType: 'email',
    width: 'full',
  };
  doc = addNode(doc, row.id, email);
  const status = newNode('Select');
  doc = addNode(doc, row.id, status);
  const button = newNode('Button');
  button.props.label = 'Refresh customers';
  button.events = {
    onClick: queryId
      ? { type: 'runQuery', queryId }
      : { type: 'showToast', message: 'Your customers are up to date.' },
  };
  doc = addNode(doc, 'root', button);
  const table = newNode('Table');
  table.props.columns = ['name', 'email', 'company', 'status'];
  doc = addNode(doc, 'root', table);
  return doc;
}

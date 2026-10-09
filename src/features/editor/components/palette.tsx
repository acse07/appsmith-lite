'use client';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Search,
  Type,
  Heading,
  MousePointer2,
  TextCursorInput,
  ListFilter,
  Square,
  Table2,
  Minus,
  GripVertical,
} from 'lucide-react';
import type { ComponentType } from '@/entities/ui-node/types';
import { registry } from '@/features/component-registry/registry';
export const componentIcons = {
  Text: Type,
  Heading,
  Button: MousePointer2,
  Input: TextCursorInput,
  Select: ListFilter,
  Container: Square,
  Table: Table2,
  Divider: Minus,
};
export function Palette({ onAdd }: { onAdd: (type: ComponentType) => void }) {
  const [search, setSearch] = useState('');
  return (
    <div className="palette">
      <div className="panel-title">
        <h3>Components</h3>
        <span>8</span>
      </div>
      <p className="panel-description">The building blocks of your app.</p>
      <div className="search-box compact">
        <Search size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a component…"
          aria-label="Find a component"
        />
      </div>
      {['Basic', 'Inputs', 'Data', 'Layout'].map((category) => (
        <div className="palette-category" key={category}>
          <h4>{category}</h4>
          <div className="palette-grid">
            {(Object.keys(registry) as ComponentType[])
              .filter(
                (t) =>
                  registry[t].category === category &&
                  t.toLowerCase().includes(search.toLowerCase()),
              )
              .map((type) => (
                <PaletteItem key={type} type={type} onAdd={onAdd} />
              ))}
          </div>
        </div>
      ))}
      <div className="palette-tip">
        <MousePointer2 size={16} />
        <p>Drag onto the canvas, or click to add to the selected container.</p>
      </div>
    </div>
  );
}
function PaletteItem({
  type,
  onAdd,
}: {
  type: ComponentType;
  onAdd: (type: ComponentType) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { type },
  });
  const Icon = componentIcons[type];
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`palette-item ${isDragging ? 'dragging' : ''}`}
      onClick={() => onAdd(type)}
      title={registry[type].description}
    >
      <Icon size={21} />
      <span>{type}</span>
      <GripVertical className="palette-grip" size={12} />
    </button>
  );
}

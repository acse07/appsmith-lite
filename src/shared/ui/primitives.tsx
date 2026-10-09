'use client';
import * as Dialog from '@radix-ui/react-dialog';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { X, MoreHorizontal, LoaderCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return <button className={clsx('btn', `btn-${variant}`, className)} {...props} />;
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          <Dialog.Description className="modal-description">
            {description ?? 'Configure your workspace.'}
          </Dialog.Description>
          <Dialog.Close className="icon-btn modal-close" aria-label="Close dialog">
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Menu({
  children,
  label = 'More actions',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="icon-btn" aria-label={label}>
        <MoreHorizontal size={20} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" sideOffset={6} align="end">
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function MenuItem({
  children,
  onSelect,
  danger = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <Dropdown.Item className={clsx('menu-item', danger && 'danger')} onSelect={onSelect}>
      {children}
    </Dropdown.Item>
  );
}
export function Loading({ text = 'Loading your workspace…' }: { text?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>{text}</span>
    </div>
  );
}
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <strong>Something needs attention</strong>
      <p>{error.message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-mark">
        <i />
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          appsmith<span className="logo-lite">lite</span>
        </span>
      )}
    </span>
  );
}

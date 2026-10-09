'use client';
import { ErrorState } from '@/shared/ui/primitives';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} retry={reset} />;
}

import Link from 'next/link';
import { Logo } from '@/shared/ui/primitives';
export default function NotFound() {
  return (
    <main className="not-found">
      <Logo />
      <h1>This page isn’t in your workspace.</h1>
      <p>The link may have changed, or you may need access from its owner.</p>
      <Link href="/" className="btn btn-primary">
        Back to workspace
      </Link>
    </main>
  );
}

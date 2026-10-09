import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
export const metadata: Metadata = {
  title: 'AppSmith Lite — Build your way',
  description: 'A visual workspace for the internal tools your team needs.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

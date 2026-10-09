import Link from 'next/link';
import { ArrowLeft, ArrowRight, Layers3, Database, Globe, MousePointer2 } from 'lucide-react';
import { Logo } from '@/shared/ui/primitives';
export default function Guide() {
  return (
    <main className="guide-page">
      <header>
        <Logo />
        <Link href="/">
          <ArrowLeft size={16} />
          Back to workspace
        </Link>
      </header>
      <span className="small-kicker">A LITTLE HELP TO GET STARTED</span>
      <h1>Your ideas, in working order.</h1>
      <p className="guide-lead">
        Build an internal tool in four simple steps. Start with the customer template to explore a
        ready-made example.
      </p>
      <div className="guide-steps">
        {[
          {
            icon: Layers3,
            title: '1. Build your interface',
            text: 'Create an application, then click or drag components onto the canvas. Containers organize elements in rows and columns. Select a component to adjust its content and style.',
          },
          {
            icon: Database,
            title: '2. Connect your data',
            text: 'Open Queries to configure an approved mock or JSONPlaceholder source. Test the request, then bind Table data to queries.yourQueryName.data. Only Accept and Content-Type headers are supported.',
          },
          {
            icon: MousePointer2,
            title: '3. Make it interactive',
            text: 'Select a button and open Events. Choose Run query, Show toast, Navigate, Set state value, or Reset inputs. Preview your draft to test the behavior. Table selections are available as state.selectedRow.',
          },
          {
            icon: Globe,
            title: '4. Share a version',
            text: 'Publish saves an immutable snapshot with pages and query configurations. Workspace members can open its URL. Continue editing your draft and publish again whenever you’re ready.',
          },
        ].map((s) => (
          <article key={s.title}>
            <s.icon size={24} />
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
      <section>
        <h2>Your keyboard, a little more useful.</h2>
        <dl>
          {[
            ['Ctrl / ⌘ + Z', 'Undo'],
            ['Ctrl / ⌘ + Shift + Z', 'Redo'],
            ['Ctrl / ⌘ + C / V', 'Copy / paste a component'],
            ['Ctrl / ⌘ + D', 'Duplicate'],
            ['Ctrl / ⌘ + S', 'Save immediately'],
            ['Delete', 'Delete selected component'],
            ['Escape', 'Deselect or cancel dragging'],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h2>Safe bindings, useful connections.</h2>
        <p>
          Use the link icon in the property inspector to bind text, labels, input defaults or
          disabled state. Paths start with <code>app</code>, <code>queries</code>,{' '}
          <code>state</code> or <code>inputs</code>. For example, <code>app.name</code>,{' '}
          <code>queries.getCustomers.isLoading</code>, <code>state.selectedRow.email</code>, or{' '}
          <code>inputs.COMPONENT_ID.value</code>.
        </p>
        <p>
          A missing value falls back to an empty state. Invalid types display an error. Each
          property expects its declared type; bindings never execute JavaScript.
        </p>
      </section>
      <Link href="/" className="btn btn-primary">
        Let’s build something
        <ArrowRight size={16} />
      </Link>
    </main>
  );
}

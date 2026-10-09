'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Layers3, MousePointer2, Sparkles } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Button, Logo } from '@/shared/ui/primitives';
const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  name: z.string().max(80).optional(),
});
type Values = z.infer<typeof schema>;
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [demoBusy, setDemoBusy] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  async function submit(values: Values) {
    try {
      setError('');
      await api(`/auth/${register ? 'register' : 'login'}`, 'POST', values);
      router.push('/');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function demo() {
    try {
      setDemoBusy(true);
      setError('');
      const result = await api<{ workspaceId: string }>('/auth/demo', 'POST', {});
      router.push(`/workspaces/${result.workspaceId}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setDemoBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <span className="eyebrow">
            <span className="orange-dot" /> LESS BUSYWORK. MORE BUILDING.
          </span>
          <h1>
            Good tools.
            <br />
            Great possibilities.
          </h1>
          <p>
            Bring your team’s workflows to life.
            <br />
            One component at a time.
          </p>
          <div className="auth-art">
            <div className="art-window">
              <div className="art-window-top">
                <span />
                <span />
                <span />
                <small>Customer operations</small>
              </div>
              <div className="art-window-body">
                <div className="art-sidebar">
                  <Layers3 size={20} />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="art-content">
                  <div className="art-bar" />
                  <div className="art-stats">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="art-table">
                    {[1, 2, 3].map((v) => (
                      <div key={v}>
                        <b />
                        <i />
                        <i />
                        <em />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <span className="art-chip">
              <MousePointer2 size={16} /> Built by you
            </span>
          </div>
          <div className="auth-points">
            <span>
              <Check size={16} /> Visual by design
            </span>
            <span>
              <Check size={16} /> Connected to your data
            </span>
          </div>
        </div>
        <small className="auth-footer">Your workflows. Your workspace. Your way.</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-box">
          <span className="small-kicker">LET’S MAKE SOMETHING USEFUL</span>
          <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'Create your account and start building.'
              : 'Your next great internal tool starts here.'}
          </p>
          <Button
            variant="secondary"
            className="demo-button"
            onClick={demo}
            disabled={demoBusy || form.formState.isSubmitting}
          >
            <Sparkles size={17} />
            {demoBusy ? 'Preparing your workspace…' : 'Explore the demo workspace'}
            <ArrowRight size={17} />
          </Button>
          <div className="or-divider">
            <span />
            or {register ? 'create an account' : 'sign in with email'}
            <span />
          </div>
          <form onSubmit={form.handleSubmit(submit)}>
            {register && (
              <label className="field">
                Full name
                <input
                  placeholder="Alex Morgan"
                  {...form.register('name', { required: true })}
                  required
                  maxLength={80}
                />
              </label>
            )}
            <label className="field">
              Email address
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <small className="field-error">{form.formState.errors.email.message}</small>
              )}
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <small className="field-error">{form.formState.errors.password.message}</small>
              )}
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Button className="full-width" disabled={form.formState.isSubmitting || demoBusy}>
              {form.formState.isSubmitting
                ? 'Just a moment…'
                : register
                  ? 'Create account'
                  : 'Sign in'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New around here?'}{' '}
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="auth-note">
            <span className="green-dot" /> A real workspace. No setup required.
          </div>
        </div>
      </section>
    </main>
  );
}

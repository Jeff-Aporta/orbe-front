/**
 * Auth.tsx — pantalla de entrada a Orbe: login y registro con JWT propio.
 * Los wa-input se leen "no controlados" (por ref) al enviar.
 */
import { useRef, useState } from 'react';
import { login, register, saveSession } from '../api';
import type { User } from '../types';

function val(ref: React.RefObject<HTMLElement | null>): string {
  return ((ref.current as unknown as { value?: string })?.value ?? '').trim();
}

export function AuthView({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nickRef = useRef<HTMLElement>(null);
  const passRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const nick = val(nickRef).toLowerCase();
      const pass = (passRef.current as unknown as { value?: string })?.value ?? '';
      const res =
        mode === 'login' ? await login(nick, pass) : await register(nick, pass, (confirmRef.current as unknown as { value?: string })?.value ?? '');
      saveSession(res.token, res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ob-auth">
      <div className="ob-auth-glow" aria-hidden="true"></div>
      <form className="ob-auth-card" onSubmit={submit}>
        <div className="ob-auth-brand">
          <span className="ob-brand-orb ob-brand-orb-lg"></span>
          <h1>Orbe</h1>
        </div>
        <p className="ob-auth-tag">To-do colaborativo en tiempo real. Tus spaces, tu equipo, un solo orbe.</p>

        <div className="ob-auth-tabs" role="tablist">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Entrar
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Crear cuenta
          </button>
        </div>

        <wa-input ref={nickRef} label="Nick" placeholder="p. ej. demo" required autocomplete="username"></wa-input>
        <wa-input ref={passRef} label="Contraseña" type="password" placeholder="mínimo 6 caracteres" required autocomplete={mode === 'login' ? 'current-password' : 'new-password'}></wa-input>
        {mode === 'register' && (
          <wa-input ref={confirmRef} label="Confirmar contraseña" type="password" placeholder="repítela" required autocomplete="new-password"></wa-input>
        )}

        {error && (
          <wa-callout variant="danger">
            <iconify-icon icon="mdi:alert-circle" slot="icon"></iconify-icon>
            {error}
          </wa-callout>
        )}

        <wa-button variant="brand" type="submit" disabled={busy} class="ob-auth-submit">
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar al orbe' : 'Crear mi cuenta'}
          <iconify-icon icon="mdi:arrow-right" slot="end"></iconify-icon>
        </wa-button>

        <p className="ob-auth-demo">
          ¿Solo miras? Entra con <code>demo / demo123</code> — también existen <code>ana</code> y <code>luis</code>.
        </p>
      </form>
    </div>
  );
}

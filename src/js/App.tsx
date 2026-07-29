/**
 * App.tsx — capa superior: sesión + ruta actual.
 *
 * Sin sesión → pantalla de auth. Con sesión → grid de spaces o detalle.
 * El encabezado (marca, usuario, salir) vive aquí para no repetirlo.
 */
import { useCallback, useEffect, useState } from 'react';
import { clearSession, getSavedUser, getToken, me, saveSession } from './api';
import { currentRoute, navigate } from './router';
import type { Route } from './router';
import type { User } from './types';
import { usePopState } from './hooks/useWa';
import { AuthView } from './views/Auth';
import { SpacesView } from './views/Spaces';
import { SpaceView } from './views/SpaceView';

export interface Session {
  user: User;
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [user, setUser] = useState<User | null>(getSavedUser());
  const [checking, setChecking] = useState(Boolean(getToken()));

  usePopState(
    useCallback(() => setRoute(currentRoute()), []),
  );

  // Valida el token guardado contra la API al arrancar.
  useEffect(() => {
    if (!getToken()) return;
    me()
      .then(({ user: u }) => {
        setUser(u);
        saveSession(getToken()!, u);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const onAuth = useCallback((u: User) => {
    setUser(u);
    navigate({ v: 'spaces' });
    setRoute({ v: 'spaces' });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div className="ob-boot">
        <iconify-icon icon="svg-spinners:ring-resize" width="34" height="34"></iconify-icon>
        <p>Verificando sesión…</p>
      </div>
    );
  }

  if (!user) return <AuthView onAuth={onAuth} />;

  return (
    <div className="ob-shell">
      <header className="ob-topbar">
        <a
          className="ob-brand"
          href="?s="
          onClick={(e) => {
            e.preventDefault();
            navigate({ v: 'spaces' });
          }}
        >
          <span className="ob-brand-orb"></span>
          Orbe
        </a>
        <div className="ob-topbar-user">
          <wa-avatar initials={user.nick.slice(0, 2).toUpperCase()} label={user.nick}></wa-avatar>
          <span className="ob-nick">@{user.nick}</span>
          <wa-button size="small" appearance="plain" onClick={logout} title="Cerrar sesión">
            <iconify-icon icon="mdi:logout"></iconify-icon>
          </wa-button>
        </div>
      </header>
      <main className="ob-main">
        {route.v === 'spaces' && <SpacesView user={user} />}
        {route.v === 'space' && <SpaceView spaceId={route.id} user={user} />}
      </main>
    </div>
  );
}

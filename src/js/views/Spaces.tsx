/**
 * Spaces.tsx — portada: grid de cards con tus spaces, crear uno nuevo y
 * unirse a un space público por su ID.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpace, joinSpace, listSpaces } from '../api';
import { navigate } from '../router';
import type { Space, User } from '../types';

export const SPACE_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'];
export const SPACE_ICONS = [
  'mdi:rocket-launch', 'mdi:home-heart', 'mdi:briefcase', 'mdi:school', 'mdi:cart',
  'mdi:airplane', 'mdi:dumbbell', 'mdi:palette', 'mdi:code-tags', 'mdi:book-open-page-variant',
];

function val(ref: React.RefObject<HTMLElement | null>): string {
  return ((ref.current as unknown as { value?: string })?.value ?? '').trim();
}

function openDialog(id: string) {
  (document.getElementById(id) as unknown as { show?: () => void })?.show?.();
}
function closeDialog(id: string) {
  (document.getElementById(id) as unknown as { hide?: () => void })?.hide?.();
}

export function SpacesView({ user }: { user: User }) {
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState(SPACE_COLORS[0]!);
  const [icon, setIcon] = useState(SPACE_ICONS[0]!);
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const nameRef = useRef<HTMLElement>(null);
  const descRef = useRef<HTMLElement>(null);
  const joinRef = useRef<HTMLElement>(null);

  const load = useCallback(() => {
    listSpaces()
      .then((r) => setSpaces(r.spaces))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error cargando spaces'));
  }, []);

  useEffect(load, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { space } = await createSpace({
        name: val(nameRef),
        description: val(descRef),
        color,
        icon,
        privacy,
      });
      closeDialog('dlg-nuevo-space');
      navigate({ v: 'space', id: space.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  }

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const id = Number(val(joinRef).replace(/\D/g, ''));
      const { space } = await joinSpace(id);
      closeDialog('dlg-unirse');
      navigate({ v: 'space', id: space.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo unir');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="ob-pagehead">
        <div>
          <h1>Hola, @{user.nick}</h1>
          <p className="ob-muted">Tus spaces de trabajo. Todo cambio se ve en vivo, sin recargar.</p>
        </div>
        <div className="ob-pagehead-actions">
          <wa-button appearance="outlined" onClick={() => openDialog('dlg-unirse')}>
            <iconify-icon icon="mdi:link-variant-plus" slot="start"></iconify-icon>
            Unirme con ID
          </wa-button>
          <wa-button variant="brand" onClick={() => openDialog('dlg-nuevo-space')}>
            <iconify-icon icon="mdi:plus" slot="start"></iconify-icon>
            Nuevo space
          </wa-button>
        </div>
      </div>

      {error && <wa-callout variant="danger">{error}</wa-callout>}

      {!spaces && (
        <div className="ob-boot"><iconify-icon icon="svg-spinners:ring-resize" width="28" height="28"></iconify-icon></div>
      )}

      {spaces && spaces.length === 0 && (
        <div className="ob-empty">
          <iconify-icon icon="mdi:rocket-launch-outline" width="44" height="44"></iconify-icon>
          <h2>Aún no tienes spaces</h2>
          <p>Crea el primero: un proyecto, tu casa, lo que sea. Invita a tu equipo por nick.</p>
        </div>
      )}

      <div className="ob-grid">
        {spaces?.map((s) => {
          const pct = s.task_count ? Math.round(((s.done_count ?? 0) / s.task_count) * 100) : 0;
          return (
            <button key={s.id} className="ob-space-card" style={{ '--sc': s.color } as React.CSSProperties} onClick={() => navigate({ v: 'space', id: s.id })}>
              <div className="ob-space-top">
                <span className="ob-space-icon"><iconify-icon icon={s.icon}></iconify-icon></span>
                <span className={`ob-pill ${s.privacy === 'public' ? 'ob-pill-public' : ''}`}>
                  <iconify-icon icon={s.privacy === 'public' ? 'mdi:earth' : 'mdi:lock'}></iconify-icon>
                  {s.privacy === 'public' ? 'público' : 'privado'}
                </span>
              </div>
              <h3>{s.name}</h3>
              <p className="ob-space-desc">{s.description || 'Sin descripción'}</p>
              <div className="ob-space-meta">
                <span><iconify-icon icon="mdi:account-group"></iconify-icon> {s.member_count}</span>
                <span><iconify-icon icon="mdi:check-circle-outline"></iconify-icon> {s.done_count}/{s.task_count}</span>
                <span className={`ob-role ob-role-${s.role}`}>{s.role}</span>
              </div>
              <wa-progress-bar value={pct}></wa-progress-bar>
            </button>
          );
        })}
      </div>

      {/* diálogo: nuevo space */}
      <wa-dialog id="dlg-nuevo-space" label="Nuevo space">
        <form onSubmit={crear} className="ob-form">
          <wa-input ref={nameRef} label="Nombre" placeholder="p. ej. Lanzamiento v2" required></wa-input>
          <wa-textarea ref={descRef} label="Descripción" rows={2} placeholder="¿de qué va este space?"></wa-textarea>

          <div className="ob-field-label">Color</div>
          <div className="ob-swatches">
            {SPACE_COLORS.map((c) => (
              <button key={c} type="button" className={`ob-swatch ${c === color ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c}></button>
            ))}
          </div>

          <div className="ob-field-label">Ícono</div>
          <div className="ob-iconpick">
            {SPACE_ICONS.map((ic) => (
              <button key={ic} type="button" className={`ob-iconbtn ${ic === icon ? 'active' : ''}`} onClick={() => setIcon(ic)}>
                <iconify-icon icon={ic}></iconify-icon>
              </button>
            ))}
          </div>

          <div className="ob-field-label">Privacidad</div>
          <div className="ob-auth-tabs">
            <button type="button" className={privacy === 'private' ? 'active' : ''} onClick={() => setPrivacy('private')}>
              <iconify-icon icon="mdi:lock"></iconify-icon> Privado
            </button>
            <button type="button" className={privacy === 'public' ? 'active' : ''} onClick={() => setPrivacy('public')}>
              <iconify-icon icon="mdi:earth"></iconify-icon> Público
            </button>
          </div>
          <p className="ob-muted ob-hint">
            {privacy === 'public'
              ? 'Cualquiera con el ID puede leerlo y unirse como lector.'
              : 'Solo entra quien invites por nick.'}
          </p>

          <wa-button variant="brand" type="submit" disabled={busy}>
            <iconify-icon icon="mdi:check" slot="start"></iconify-icon>
            Crear space
          </wa-button>
        </form>
      </wa-dialog>

      {/* diálogo: unirse */}
      <wa-dialog id="dlg-unirse" label="Unirme a un space público">
        <form onSubmit={unirse} className="ob-form">
          <wa-input ref={joinRef} label="ID del space" placeholder="p. ej. 1" required></wa-input>
          <p className="ob-muted ob-hint">Entrarás como lector; un admin puede subirte a editor.</p>
          <wa-button variant="brand" type="submit" disabled={busy}>Unirme</wa-button>
        </form>
      </wa-dialog>
    </div>
  );
}

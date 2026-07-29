/**
 * SpaceView.tsx — el corazón de Orbe: tablero kanban + lista, filtros,
 * búsqueda, drag & drop para reordenar y mover de columna, presencia en vivo
 * por WebSocket, gestión de miembros y ajustes del space.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMember, createTask, deleteSpace, getPermisos, getSpace, listTasks, removeMember,
  setMemberRole, updateSpace, updateTask,
} from '../api';
import { API_WS } from '../config';
import { getToken } from '../api';
import { navigate } from '../router';
import type { Member, Space, Status, Tag, Task, User, WsEvent } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { SPACE_COLORS, SPACE_ICONS } from './Spaces';

const COLUMNS: { id: Status; label: string; icon: string }[] = [
  { id: 'pendiente', label: 'Pendiente', icon: 'mdi:circle-outline' },
  { id: 'en_progreso', label: 'En progreso', icon: 'mdi:progress-clock' },
  { id: 'hecha', label: 'Hecha', icon: 'mdi:check-circle' },
];

function elVal(ref: React.RefObject<HTMLElement | null>): string {
  return ((ref.current as unknown as { value?: string })?.value ?? '').trim();
}

export function SpaceView({ spaceId, user }: { spaceId: number; user: User }) {
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [permisos, setPermisos] = useState<Record<string, boolean>>({});
  const [online, setOnline] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [q, setQ] = useState('');
  const [fTag, setFTag] = useState<number | null>(null);
  const [fPri, setFPri] = useState<string | null>(null);
  const [fAssignee, setFAssignee] = useState<number | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropCol, setDropCol] = useState<Status | null>(null);

  const newTaskRef = useRef<HTMLElement>(null);
  const memberNickRef = useRef<HTMLElement>(null);
  const setNameRef = useRef<HTMLElement>(null);
  const setDescRef = useRef<HTMLElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // La UI manda la matriz SEG (GET /spaces/:id/permisos), no el rol a pelo.
  const perm = useCallback((iaccion: string) => permisos[iaccion] === true, [permisos]);
  const canEdit = perm('tasks:update'); // editar/completar/reordenar tareas
  const canCreate = perm('tasks:create');
  const isAdmin = perm('spaces:update'); // ajustes del space + matriz
  const canInvite = perm('spaces:invite');
  const canManageMembers = perm('members:update');

  /* ---------- carga ---------- */

  const loadMeta = useCallback(() => {
    getSpace(spaceId)
      .then((r) => {
        setSpace(r.space);
        setMembers(r.members);
        setTags(r.tags);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    getPermisos(spaceId)
      .then((r) => setPermisos(r.permisos))
      .catch(() => setPermisos({}));
  }, [spaceId]);

  const loadTasks = useCallback(() => {
    listTasks(spaceId)
      .then((r) => setTasks(r.tasks))
      .catch(() => {});
  }, [spaceId]);

  useEffect(() => {
    loadMeta();
    loadTasks();
  }, [loadMeta, loadTasks]);

  /* ---------- tiempo real ---------- */

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let closed = false;
    let retry = 0;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(`${API_WS}/spaces/${spaceId}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        ws.send(JSON.stringify({ type: 'hello', nick: user.nick }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WsEvent;
          if (msg.type === 'presence') setOnline(msg.online);
          if (msg.type === 'tasks_changed') loadTasks();
          if (msg.type === 'members_changed' || msg.type === 'space_changed') loadMeta();
        } catch {
          /* ignorar */
        }
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connect, Math.min(8000, 500 * 2 ** retry++));
      };
    };
    connect();
    return () => {
      closed = true;
      wsRef.current?.close();
    };
  }, [spaceId, user.nick, loadTasks, loadMeta]);

  /* ---------- filtros ---------- */

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (needle && !`${t.title} ${t.notes}`.toLowerCase().includes(needle)) return false;
      if (fTag && !t.tags.some((x) => x.id === fTag)) return false;
      if (fPri && t.priority !== fPri) return false;
      if (fAssignee && t.assignee_id !== fAssignee) return false;
      return true;
    });
  }, [tasks, q, fTag, fPri, fAssignee]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { pendiente: [], en_progreso: [], hecha: [] };
    for (const t of visible) map[t.status].push(t);
    return map;
  }, [visible]);

  /* ---------- acciones ---------- */

  async function nuevaTarea(e: React.FormEvent) {
    e.preventDefault();
    const title = elVal(newTaskRef);
    if (!title) return;
    try {
      await createTask(spaceId, title);
      (newTaskRef.current as unknown as { value: string }).value = '';
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  /** Drag & drop: soltar sobre una columna cambia estado y posición. */
  async function dropOn(col: Status, beforeId: number | null) {
    setDropCol(null);
    if (dragId == null || !canEdit) return;
    const colTasks = byStatus[col].filter((t) => t.id !== dragId);
    const idx = beforeId == null ? colTasks.length : colTasks.findIndex((t) => t.id === beforeId);
    const prev = idx > 0 ? colTasks[idx - 1] : undefined;
    const next = idx < colTasks.length ? colTasks[idx] : undefined;
    const position = prev && next ? (prev.position + next.position) / 2 : next ? next.position - 1 : prev ? prev.position + 1 : 0;
    try {
      await updateTask(spaceId, dragId, { status: col, position });
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
    setDragId(null);
  }

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    const nick = elVal(memberNickRef);
    if (!nick) return;
    try {
      await addMember(spaceId, nick, 'editor');
      (memberNickRef.current as unknown as { value: string }).value = '';
      loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function guardarAjustes(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSpace(spaceId, { name: elVal(setNameRef) || undefined, description: elVal(setDescRef) });
      loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  function openDialog(id: string) {
    (document.getElementById(id) as unknown as { show?: () => void })?.show?.();
  }

  if (error && !space) {
    return (
      <div className="ob-empty">
        <iconify-icon icon="mdi:lock-alert" width="44" height="44"></iconify-icon>
        <h2>{error}</h2>
        <wa-button appearance="outlined" onClick={() => navigate({ v: 'spaces' })}>Volver a mis spaces</wa-button>
      </div>
    );
  }

  if (!space) {
    return <div className="ob-boot"><iconify-icon icon="svg-spinners:ring-resize" width="28" height="28"></iconify-icon></div>;
  }

  return (
    <div>
      {/* encabezado del space */}
      <div className="ob-space-head" style={{ '--sc': space.color } as React.CSSProperties}>
        <button className="ob-back" onClick={() => navigate({ v: 'spaces' })} title="Volver">
          <iconify-icon icon="mdi:arrow-left"></iconify-icon>
        </button>
        <span className="ob-space-icon"><iconify-icon icon={space.icon}></iconify-icon></span>
        <div className="ob-space-head-info">
          <h1>
            {space.name}
            <span className={`ob-pill ${space.privacy === 'public' ? 'ob-pill-public' : ''}`}>
              <iconify-icon icon={space.privacy === 'public' ? 'mdi:earth' : 'mdi:lock'}></iconify-icon>
              {space.privacy === 'public' ? 'público' : 'privado'}
            </span>
          </h1>
          <p className="ob-muted">{space.description} · ID {space.id}</p>
        </div>

        <div className="ob-presence" title={`En línea: ${online.join(', ') || 'nadie'}`}>
          {online.slice(0, 5).map((n) => (
            <span key={n} className="ob-presence-dot" title={`@${n}`}>{n.slice(0, 2).toUpperCase()}</span>
          ))}
          <span className="ob-muted">{online.length} en línea</span>
        </div>

        <div className="ob-pagehead-actions">
          {isAdmin && (
            <>
              <wa-button appearance="outlined" size="s" onClick={() => openDialog('dlg-miembros')}>
                <iconify-icon icon="mdi:account-multiple" slot="start"></iconify-icon> Miembros
              </wa-button>
              <wa-button appearance="outlined" size="s" onClick={() => openDialog('dlg-ajustes')}>
                <iconify-icon icon="mdi:cog" slot="start"></iconify-icon> Ajustes
              </wa-button>
            </>
          )}
          {!isAdmin && (
            <wa-button appearance="outlined" size="s" onClick={() => openDialog('dlg-miembros')}>
              <iconify-icon icon="mdi:account-multiple" slot="start"></iconify-icon> Miembros
            </wa-button>
          )}
        </div>
      </div>

      {error && <wa-callout variant="danger">{error}</wa-callout>}

      {/* barra de herramientas */}
      <div className="ob-toolbar">
        {canCreate ? (
          <form onSubmit={nuevaTarea} className="ob-newtask">
            <wa-input ref={newTaskRef} placeholder="Nueva tarea… (Enter para crear)" size="s"></wa-input>
            <wa-button variant="brand" size="s" type="submit">
              <iconify-icon icon="mdi:plus"></iconify-icon>
            </wa-button>
          </form>
        ) : (
          <span className="ob-readonly-note">
            <iconify-icon icon="mdi:lock"></iconify-icon> Estás como lector: puedes ver todo, pero no modificar.
          </span>
        )}

        <div className="ob-filters">
          <wa-input
            placeholder="Buscar…"
            size="s"
            value={q}
            onInput={(e: React.FormEvent) => setQ((e.target as unknown as { value: string }).value)}
          >
            <iconify-icon icon="mdi:magnify" slot="start"></iconify-icon>
          </wa-input>

          <div className="ob-task-tags">
            {tags.map((t) => (
              <button key={t.id} className={`ob-chip ob-chip-btn ${fTag === t.id ? 'active' : ''}`} style={{ '--chip': t.color } as React.CSSProperties} onClick={() => setFTag(fTag === t.id ? null : t.id)}>
                {t.name}
              </button>
            ))}
          </div>

          <wa-select
            placeholder="Prioridad"
            size="s"
            value={fPri ?? ''}
            onChange={(e: React.FormEvent) => setFPri((e.target as unknown as { value: string }).value || null)}
          >
            <wa-option value="">Todas las prioridades</wa-option>
            <wa-option value="baja">Baja</wa-option>
            <wa-option value="media">Media</wa-option>
            <wa-option value="alta">Alta</wa-option>
            <wa-option value="urgente">Urgente</wa-option>
          </wa-select>

          <wa-select
            placeholder="Asignado"
            size="s"
            value={fAssignee ? String(fAssignee) : ''}
            onChange={(e: React.FormEvent) => setFAssignee(Number((e.target as unknown as { value: string }).value) || null)}
          >
            <wa-option value="">Cualquiera</wa-option>
            {members.map((m) => (
              <wa-option key={m.id} value={String(m.id)}>@{m.nick}</wa-option>
            ))}
          </wa-select>

          <div className="ob-seg">
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')} title="Tablero">
              <iconify-icon icon="mdi:view-column"></iconify-icon>
            </button>
            <button className={view === 'lista' ? 'active' : ''} onClick={() => setView('lista')} title="Lista">
              <iconify-icon icon="mdi:format-list-bulleted"></iconify-icon>
            </button>
          </div>
        </div>
      </div>

      {/* tablero kanban */}
      {view === 'kanban' && (
        <div className="ob-board">
          {COLUMNS.map((col) => (
            <section
              key={col.id}
              className={`ob-col ${dropCol === col.id ? 'ob-col-over' : ''}`}
              onDragOver={(e) => {
                if (canEdit) {
                  e.preventDefault();
                  setDropCol(col.id);
                }
              }}
              onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                dropOn(col.id, null);
              }}
            >
              <header className="ob-col-head">
                <iconify-icon icon={col.icon}></iconify-icon>
                <h2>{col.label}</h2>
                <span className="ob-count">{byStatus[col.id].length}</span>
              </header>
              <div className="ob-col-body">
                {byStatus[col.id].map((t) => (
                  <div
                    key={t.id}
                    onDragOver={(e) => {
                      if (canEdit && dragId !== t.id) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dropOn(col.id, t.id);
                    }}
                  >
                    <TaskCard
                      task={t}
                      canEdit={canEdit}
                      onOpen={() => setOpenTask(t)}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropCol(null);
                      }}
                    />
                  </div>
                ))}
                {byStatus[col.id].length === 0 && <p className="ob-muted ob-col-empty">Nada por aquí</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* vista lista */}
      {view === 'lista' && (
        <div className="ob-list">
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} canEdit={canEdit} onOpen={() => setOpenTask(t)} />
          ))}
          {visible.length === 0 && <p className="ob-muted">Sin resultados con estos filtros.</p>}
        </div>
      )}

      {/* diálogo de tarea */}
      {openTask && (
        <TaskDialog
          key={openTask.id}
          spaceId={spaceId}
          task={tasks.find((t) => t.id === openTask.id) ?? openTask}
          members={members}
          tags={tags}
          canEdit={canEdit}
          onClose={() => setOpenTask(null)}
          onChanged={loadTasks}
          onDeleted={loadTasks}
        />
      )}

      {/* diálogo miembros */}
      <wa-dialog id="dlg-miembros" label="Miembros del space">
        <ul className="ob-members">
          {members.map((m) => (
            <li key={m.id}>
              <span className="ob-assignee">{m.nick.slice(0, 2).toUpperCase()}</span>
              <span className="ob-member-nick">
                @{m.nick}
                {m.id === space.owner_id && <em title="Dueño"><iconify-icon icon="mdi:crown"></iconify-icon></em>}
                {online.includes(m.nick) && <i className="ob-online" title="en línea"></i>}
              </span>
              {canManageMembers && m.id !== space.owner_id ? (
                <>
                  <wa-select
                    size="s"
                    value={m.role}
                    onChange={(e: React.FormEvent) =>
                      setMemberRole(spaceId, m.id, (e.target as unknown as { value: string }).value).then(loadMeta)
                    }
                  >
                    <wa-option value="admin">admin</wa-option>
                    <wa-option value="editor">editor</wa-option>
                    <wa-option value="reader">lector</wa-option>
                  </wa-select>
                  <wa-button size="s" appearance="plain" onClick={() => removeMember(spaceId, m.id).then(loadMeta)}>
                    <iconify-icon icon="mdi:account-remove"></iconify-icon>
                  </wa-button>
                </>
              ) : (
                <span className={`ob-role ob-role-${m.role}`}>{m.role}</span>
              )}
              {m.id === user.id && m.id !== space.owner_id && (
                <wa-button size="s" appearance="plain" title="Salir del space" onClick={() => removeMember(spaceId, m.id).then(() => navigate({ v: 'spaces' }))}>
                  <iconify-icon icon="mdi:exit-to-app"></iconify-icon>
                </wa-button>
              )}
            </li>
          ))}
        </ul>
        {canInvite && (
          <form onSubmit={invitar} className="ob-inline">
            <wa-input ref={memberNickRef} placeholder="Invitar por nick (entra como editor)…" size="s"></wa-input>
            <wa-button variant="brand" size="s" type="submit">
              <iconify-icon icon="mdi:account-plus"></iconify-icon>
            </wa-button>
          </form>
        )}
      </wa-dialog>

      {/* diálogo ajustes */}
      {isAdmin && (
        <wa-dialog id="dlg-ajustes" label="Ajustes del space">
          <form onSubmit={guardarAjustes} className="ob-form">
            <wa-input ref={setNameRef} label="Nombre" value={space.name}></wa-input>
            <wa-textarea ref={setDescRef} label="Descripción" rows={2} value={space.description}></wa-textarea>
            <div className="ob-field-label">Privacidad</div>
            <div className="ob-auth-tabs">
              <button type="button" className={space.privacy === 'private' ? 'active' : ''} onClick={() => updateSpace(spaceId, { privacy: 'private' }).then(loadMeta)}>
                <iconify-icon icon="mdi:lock"></iconify-icon> Privado
              </button>
              <button type="button" className={space.privacy === 'public' ? 'active' : ''} onClick={() => updateSpace(spaceId, { privacy: 'public' }).then(loadMeta)}>
                <iconify-icon icon="mdi:earth"></iconify-icon> Público
              </button>
            </div>
            <div className="ob-field-label">Color e ícono</div>
            <div className="ob-swatches">
              {SPACE_COLORS.map((c) => (
                <button key={c} type="button" className={`ob-swatch ${c === space.color ? 'active' : ''}`} style={{ background: c }} onClick={() => updateSpace(spaceId, { color: c }).then(loadMeta)}></button>
              ))}
            </div>
            <div className="ob-iconpick">
              {SPACE_ICONS.map((ic) => (
                <button key={ic} type="button" className={`ob-iconbtn ${ic === space.icon ? 'active' : ''}`} onClick={() => updateSpace(spaceId, { icon: ic }).then(loadMeta)}>
                  <iconify-icon icon={ic}></iconify-icon>
                </button>
              ))}
            </div>
            <wa-button variant="brand" type="submit">Guardar</wa-button>
            <wa-divider></wa-divider>
            <wa-button
              variant="danger"
              appearance="outlined"
              onClick={() => {
                if (window.confirm('¿Eliminar el space con todas sus tareas? No hay vuelta atrás.')) {
                  deleteSpace(spaceId).then(() => navigate({ v: 'spaces' }));
                }
              }}
            >
              <iconify-icon icon="mdi:delete-forever" slot="start"></iconify-icon> Eliminar space
            </wa-button>
          </form>
        </wa-dialog>
      )}
    </div>
  );
}

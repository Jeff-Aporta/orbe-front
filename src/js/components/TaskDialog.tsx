/**
 * TaskDialog.tsx — edición completa de una tarea dentro de un wa-dialog:
 * título, notas, prioridad, estado, fecha, asignado, etiquetas, checklist,
 * imágenes (R2) y comentarios. Los lectores la ven en modo solo-lectura.
 */
import { useEffect, useRef, useState } from 'react';
import {
  addComment, addSubtask, createTag, deleteImage, deleteSubtask, deleteTask,
  updateSubtask, updateTask, uploadImage,
} from '../api';
import { API } from '../config';
import type { Member, Tag, Task } from '../types';
import { PRIORITY_META } from './TaskCard';

const TAG_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#f87171'];

function elVal(ref: React.RefObject<HTMLElement | null>): string {
  return ((ref.current as unknown as { value?: string })?.value ?? '').trim();
}

export function TaskDialog({
  spaceId,
  task,
  members,
  tags,
  canEdit,
  onClose,
  onChanged,
  onDeleted,
}: {
  spaceId: number;
  task: Task;
  members: Member[];
  tags: Tag[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[1]!);
  const notesRef = useRef<HTMLElement>(null);
  const dueRef = useRef<HTMLElement>(null);
  const subRef = useRef<HTMLElement>(null);
  const commentRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dlg = dialogRef.current as unknown as { show?: () => void } | null;
    dlg?.show?.();
  }, []);

  function close() {
    (dialogRef.current as unknown as { hide?: () => void })?.hide?.();
    onClose();
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const tagIds = new Set(task.tags.map((t) => t.id));

  async function saveBasics() {
    const notes = (notesRef.current as unknown as { value?: string })?.value ?? '';
    const due = elVal(dueRef);
    await run(() =>
      updateTask(spaceId, task.id, {
        notes,
        due_date: due || null,
      }),
    );
  }

  async function toggleTag(tagId: number) {
    const next = new Set(tagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    await run(() => updateTask(spaceId, task.id, { tag_ids: [...next] }));
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    await run(() => uploadImage(spaceId, task.id, f));
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <wa-dialog ref={dialogRef} label={canEdit ? 'Editar tarea' : 'Ver tarea'} class="ob-task-dialog" onClick={(e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'WA-DIALOG') close();
    }}>
      <div className="ob-td">
        {error && <wa-callout variant="danger">{error}</wa-callout>}

        {/* estado + prioridad */}
        <div className="ob-td-row">
          <div>
            <div className="ob-field-label">Estado</div>
            <div className="ob-seg">
              {(['pendiente', 'en_progreso', 'hecha'] as const).map((s) => (
                <button
                  key={s}
                  className={task.status === s ? 'active' : ''}
                  disabled={!canEdit || busy}
                  onClick={() => run(() => updateTask(spaceId, task.id, { status: s }))}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="ob-field-label">Prioridad</div>
            <div className="ob-seg">
              {Object.entries(PRIORITY_META).map(([p, m]) => (
                <button
                  key={p}
                  className={`${task.priority === p ? 'active' : ''} ${m.cls}`}
                  title={m.label}
                  disabled={!canEdit || busy}
                  onClick={() => run(() => updateTask(spaceId, task.id, { priority: p }))}
                >
                  <iconify-icon icon={m.icon}></iconify-icon>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ob-td-row">
          <wa-input ref={dueRef} label="Fecha límite" type="date" value={task.due_date ?? ''} disabled={!canEdit}></wa-input>
          <div>
            <div className="ob-field-label">Asignada a</div>
            <div className="ob-memberpick">
              <button className={!task.assignee_id ? 'active' : ''} disabled={!canEdit} onClick={() => run(() => updateTask(spaceId, task.id, { assignee_id: null }))}>
                —
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  className={task.assignee_id === m.id ? 'active' : ''}
                  title={`@${m.nick}`}
                  disabled={!canEdit}
                  onClick={() => run(() => updateTask(spaceId, task.id, { assignee_id: m.id }))}
                >
                  {m.nick.slice(0, 2).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <wa-textarea ref={notesRef} label="Notas" rows={3} value={task.notes} disabled={!canEdit}></wa-textarea>
        {canEdit && (
          <wa-button size="s" appearance="outlined" onClick={saveBasics} disabled={busy}>
            <iconify-icon icon="mdi:content-save" slot="start"></iconify-icon> Guardar notas y fecha
          </wa-button>
        )}

        {/* etiquetas */}
        <div className="ob-field-label">Etiquetas</div>
        <div className="ob-task-tags">
          {tags.map((t) => (
            <button
              key={t.id}
              className={`ob-chip ob-chip-btn ${tagIds.has(t.id) ? 'active' : ''}`}
              style={{ '--chip': t.color } as React.CSSProperties}
              disabled={!canEdit}
              onClick={() => toggleTag(t.id)}
            >
              {t.name}
            </button>
          ))}
          {canEdit && (
            <span className="ob-newtag">
              <input ref={tagRef as React.RefObject<HTMLInputElement>} placeholder="nueva etiqueta" maxLength={24} />
              {TAG_COLORS.map((c) => (
                <i key={c} className={c === newTagColor ? 'active' : ''} style={{ background: c }} onClick={() => setNewTagColor(c)}></i>
              ))}
              <wa-button
                size="s"
                appearance="plain"
                onClick={() =>
                  run(async () => {
                    const name = elVal(tagRef);
                    if (!name) return;
                    const { tag } = await createTag(spaceId, name, newTagColor);
                    await updateTask(spaceId, task.id, { tag_ids: [...tagIds, tag.id] });
                  })
                }
              >
                <iconify-icon icon="mdi:plus"></iconify-icon>
              </wa-button>
            </span>
          )}
        </div>

        {/* checklist */}
        <div className="ob-field-label">Checklist</div>
        <ul className="ob-subs">
          {task.subtasks.map((s) => (
            <li key={s.id} className={s.done ? 'done' : ''}>
              <wa-checkbox
                checked={s.done}
                disabled={!canEdit}
                onClick={(e: React.MouseEvent) => {
                  const checked = (e.target as unknown as { checked: boolean }).checked;
                  run(() => updateSubtask(spaceId, s.id, { done: checked }));
                }}
              >
                {s.title}
              </wa-checkbox>
              {canEdit && (
                <button className="ob-mini" onClick={() => run(() => deleteSubtask(spaceId, s.id))} title="Quitar">
                  <iconify-icon icon="mdi:close"></iconify-icon>
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="ob-inline">
            <wa-input ref={subRef} placeholder="Añadir paso…" size="s"></wa-input>
            <wa-button size="s" appearance="outlined" disabled={busy} onClick={() => {
              const t = elVal(subRef);
              if (t) run(() => addSubtask(spaceId, task.id, t));
            }}>
              <iconify-icon icon="mdi:plus"></iconify-icon>
            </wa-button>
          </div>
        )}

        {/* imágenes */}
        <div className="ob-field-label">Imágenes</div>
        <div className="ob-imgs">
          {task.images.map((img) => (
            <figure key={img.id}>
              <img src={`${API}${img.url}`} alt="" />
              {canEdit && (
                <button className="ob-mini ob-imgdel" onClick={() => run(() => deleteImage(spaceId, img.id))} title="Eliminar imagen">
                  <iconify-icon icon="mdi:delete"></iconify-icon>
                </button>
              )}
            </figure>
          ))}
          {canEdit && (
            <button className="ob-imgadd" onClick={() => fileRef.current?.click()} disabled={busy}>
              <iconify-icon icon="mdi:image-plus"></iconify-icon>
              <span>{busy ? 'Subiendo…' : 'Subir'}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>

        {/* comentarios */}
        <div className="ob-field-label">Comentarios</div>
        <ul className="ob-comments">
          {task.comments.map((c) => (
            <li key={c.id}>
              <span className="ob-assignee">{c.nick.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>@{c.nick}</strong>
                <p>{c.body}</p>
              </div>
            </li>
          ))}
          {task.comments.length === 0 && <li className="ob-muted">Sin comentarios todavía.</li>}
        </ul>
        {canEdit && (
          <div className="ob-inline">
            <wa-input ref={commentRef} placeholder="Escribe un comentario…" size="s"></wa-input>
            <wa-button size="s" appearance="outlined" disabled={busy} onClick={() => {
              const t = elVal(commentRef);
              if (t) run(() => addComment(spaceId, task.id, t));
            }}>
              <iconify-icon icon="mdi:send"></iconify-icon>
            </wa-button>
          </div>
        )}

        <div className="ob-td-actions">
          {canEdit && (
            <wa-button
              size="s"
              variant="danger"
              appearance="outlined"
              disabled={busy}
              onClick={() => {
                if (window.confirm('¿Eliminar esta tarea definitivamente?')) {
                  run(() => deleteTask(spaceId, task.id)).then(() => {
                    close();
                    onDeleted();
                  });
                }
              }}
            >
              <iconify-icon icon="mdi:delete-outline" slot="start"></iconify-icon> Eliminar
            </wa-button>
          )}
          <wa-button size="s" appearance="outlined" onClick={close}>Cerrar</wa-button>
        </div>
      </div>
    </wa-dialog>
  );
}

/**
 * TaskCard.tsx — la tarjeta de una tarea en el tablero/lista.
 * Muestra prioridad, etiquetas, subtareas (progreso), fecha, asignado,
 * imágenes y comentarios. Arrastrable para reordenar/cambiar de columna.
 */
import { API } from '../config';
import type { Task } from '../types';

export const PRIORITY_META: Record<string, { label: string; icon: string; cls: string }> = {
  baja: { label: 'Baja', icon: 'mdi:chevron-down', cls: 'ob-pri-baja' },
  media: { label: 'Media', icon: 'mdi:minus', cls: 'ob-pri-media' },
  alta: { label: 'Alta', icon: 'mdi:chevron-up', cls: 'ob-pri-alta' },
  urgente: { label: 'Urgente', icon: 'mdi:fire', cls: 'ob-pri-urgente' },
};

export function dueMeta(due: string | null): { label: string; cls: string } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  if (diff < 0) return { label: `${label} · vencida`, cls: 'ob-due-late' };
  if (diff === 0) return { label: 'hoy', cls: 'ob-due-today' };
  if (diff <= 2) return { label, cls: 'ob-due-soon' };
  return { label, cls: '' };
}

export function TaskCard({
  task,
  canEdit,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  canEdit: boolean;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const pri = PRIORITY_META[task.priority] ?? PRIORITY_META.media!;
  const due = dueMeta(task.due_date);
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  return (
    <article
      className={`ob-task ${task.status === 'hecha' ? 'ob-task-done' : ''} ${canEdit ? 'ob-task-draggable' : ''}`}
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      {task.images[0] && (
        <div className="ob-task-img">
          <img src={`${API}${task.images[0].url}`} alt="" loading="lazy" />
        </div>
      )}
      <div className="ob-task-head">
        <span className={`ob-pri ${pri.cls}`} title={`Prioridad ${pri.label}`}>
          <iconify-icon icon={pri.icon}></iconify-icon>
        </span>
        <h4>{task.title}</h4>
      </div>
      {task.tags.length > 0 && (
        <div className="ob-task-tags">
          {task.tags.map((t) => (
            <span key={t.id} className="ob-chip" style={{ '--chip': t.color } as React.CSSProperties}>
              {t.name}
            </span>
          ))}
        </div>
      )}
      <div className="ob-task-foot">
        {due && (
          <span className={`ob-due ${due.cls}`}>
            <iconify-icon icon="mdi:calendar-clock"></iconify-icon> {due.label}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className={doneSubs === task.subtasks.length ? 'ob-ok' : ''}>
            <iconify-icon icon="mdi:checkbox-marked-outline"></iconify-icon> {doneSubs}/{task.subtasks.length}
          </span>
        )}
        {task.comments.length > 0 && (
          <span>
            <iconify-icon icon="mdi:comment-text-outline"></iconify-icon> {task.comments.length}
          </span>
        )}
        {task.images.length > 0 && (
          <span>
            <iconify-icon icon="mdi:image-outline"></iconify-icon> {task.images.length}
          </span>
        )}
        <span className="ob-task-spacer"></span>
        {task.assignee_nick && (
          <span className="ob-assignee" title={`Asignada a @${task.assignee_nick}`}>
            {task.assignee_nick.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </article>
  );
}

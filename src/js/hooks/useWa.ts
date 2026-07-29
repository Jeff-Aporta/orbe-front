/**
 * useWa.ts — el mismo puente de la fase A, pero tipado.
 *
 * Los componentes de Web Awesome avisan sus cambios con su propio evento
 * (`wa-input` mientras escribes, `wa-change` al confirmar). React no escucha
 * esos eventos por defecto, así que hay que conectarlos a mano una vez.
 */
import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useWaEvent<T extends HTMLElement>(
  ref: RefObject<T | null>,
  evento: 'wa-change' | 'wa-input',
  alCambiar: (el: T) => void,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => alCambiar(e.target as T);
    el.addEventListener(evento, handler);
    return () => el.removeEventListener(evento, handler);
  }, [ref, evento, alCambiar]);
}

/** Escucha los cambios de ruta (incluye el botón atrás del navegador). */
export function usePopState(alCambiar: () => void): void {
  useEffect(() => {
    window.addEventListener('popstate', alCambiar);
    return () => window.removeEventListener('popstate', alCambiar);
  }, [alCambiar]);
}

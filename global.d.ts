/**
 * global.d.ts — le enseña a TypeScript las etiquetas de Web Awesome.
 *
 * Sin este archivo, TypeScript marca en rojo cada <wa-card> porque no conoce
 * esas etiquetas: solo conoce las estándar de HTML. Aquí las declaramos una vez
 * y quedan tipadas en todo el proyecto. No genera nada en tiempo de ejecución:
 * es solo información para el chequeo de tipos.
 */
import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, ReactNode, Ref } from 'react';

/** Props comunes a cualquier custom element: hijos, clase, estilo, slot y ref. */
type CEProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>, 'ref' | 'style'> & {
  children?: ReactNode;
  class?: string;
  style?: CSSProperties & Record<string, string | number | undefined>;
  slot?: string;
  ref?: Ref<HTMLElement | null>;
  [attr: string]: unknown;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': CEProps & { icon?: string; width?: string | number; height?: string | number };
      'wa-badge': CEProps & { variant?: string; pill?: boolean };
      'wa-button': CEProps & {
        variant?: string;
        appearance?: 'accent' | 'filled' | 'outlined' | 'filled-outlined' | 'plain';
        size?: string;
        disabled?: boolean;
      };
      'wa-callout': CEProps & { variant?: string };
      'wa-card': CEProps & { 'with-header'?: boolean; 'with-footer'?: boolean };
      'wa-divider': CEProps;
      'wa-icon': CEProps & { name?: string };
      'wa-input': CEProps & {
        label?: string;
        type?: string;
        value?: string;
        placeholder?: string;
        size?: string;
      };
      'wa-progress-bar': CEProps & { value?: number; label?: string };
      'wa-switch': CEProps & { checked?: boolean; size?: string };
      'wa-tag': CEProps & { variant?: string; pill?: boolean; size?: string };
      'wa-dialog': CEProps & { label?: string; open?: boolean; 'without-header'?: boolean };
      'wa-select': CEProps & { label?: string; value?: string; placeholder?: string; size?: string };
      'wa-option': CEProps & { value?: string };
      'wa-textarea': CEProps & { label?: string; value?: string; placeholder?: string; rows?: number };
      'wa-avatar': CEProps & { initials?: string; label?: string };
      'wa-checkbox': CEProps & { checked?: boolean; size?: string };
      'wa-spinner': CEProps;
      'wa-tooltip': CEProps & { 'for'?: string };
      'wa-dropdown': CEProps & { placement?: string };
      'wa-radio-group': CEProps & { label?: string; value?: string };
      'wa-radio': CEProps & { value?: string };
      'wa-progress-ring': CEProps & { value?: number };
    }
  }
}

export {};

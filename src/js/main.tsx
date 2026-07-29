/**
 * main.tsx — punto de entrada: monta la app en #root.
 */
import { createRoot } from 'react-dom/client';
import { App } from './App';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('Falta el contenedor con id root en el HTML');

createRoot(contenedor).render(<App />);

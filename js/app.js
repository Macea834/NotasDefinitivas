// Punto de entrada de la aplicación.
// Los módulos de tipo "module" se ejecutan después de cargar el HTML,
// por eso el DOM ya está disponible aquí.
import { abrirBaseDatos, isIndexedDBSupported } from './db.js';

const alertaAcceso = document.getElementById('alerta-acceso');

async function iniciarApp() {
  // Sin IndexedDB no hay forma de guardar datos: se informa y se detiene.
  if (!isIndexedDBSupported()) {
    alertaAcceso.textContent = 'Tu navegador no es compatible con IndexedDB. Usa una versión reciente de Chrome, Firefox, Edge o Safari.';
    return;
  }

  try {
    const db = await abrirBaseDatos();
    // Prueba de esta fase: deben aparecer los tres almacenes.
    console.info('Almacenes creados:', Array.from(db.objectStoreNames));
  } catch (error) {
    console.error('Error al abrir IndexedDB:', error);
    alertaAcceso.textContent = 'No fue posible iniciar la base de datos local.';
  }
}

iniciarApp();
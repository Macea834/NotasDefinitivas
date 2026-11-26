// Lógica de acceso por documento (HU-1). No manipula el DOM.
import { abrirBaseDatos, STORES } from './db.js';

// Solo dígitos. Se valida como texto para no perder ceros iniciales.
const SOLO_DIGITOS = /^\d+$/;

// Valida el texto del campo y devuelve el documento limpio o un mensaje de error.
export function validarDocumento(texto) {
  const valor = String(texto ?? '').trim();

  if (valor === '') {
    return { ok: false, mensaje: 'Escribe tu número de documento para continuar.' };
  }
  if (!SOLO_DIGITOS.test(valor)) {
    return { ok: false, mensaje: 'El documento solo puede contener números.' };
  }
  return { ok: true, valor };
}

// Registra al usuario si no existe y activa su sesión.
// Consulta, inserción y sesión van en UNA transacción para evitar duplicados.
export async function iniciarSesion(documento) {
  const db = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.USUARIOS, STORES.SESIONES], 'readwrite');
    const usuarios = tx.objectStore(STORES.USUARIOS);
    const sesiones = tx.objectStore(STORES.SESIONES);
    let esNuevo = false;

    const consulta = usuarios.get(documento);

    consulta.onsuccess = () => {
      if (!consulta.result) {
        esNuevo = true;
        usuarios.add({ documento, creado: new Date().toISOString() });
      }
      // 'activa' es la única sesión; put la crea o la reemplaza.
      sesiones.put({ id: 'activa', documento });
    };

    tx.oncomplete = () => resolve({ documento, nuevo: esNuevo });
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });
}

// Devuelve el registro de la sesión activa, o null si no hay ninguna.
export async function obtenerSesionActiva() {
  const db = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const peticion = db
      .transaction(STORES.SESIONES, 'readonly')
      .objectStore(STORES.SESIONES)
      .get('activa');

    peticion.onsuccess = () => resolve(peticion.result ?? null);
    peticion.onerror = () => reject(peticion.error);
  });
}

// Indica si un documento sigue registrado en la base local.
export async function usuarioExiste(documento) {
  const db = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const peticion = db
      .transaction(STORES.USUARIOS, 'readonly')
      .objectStore(STORES.USUARIOS)
      .get(documento);

    peticion.onsuccess = () => resolve(Boolean(peticion.result));
    peticion.onerror = () => reject(peticion.error);
  });
}
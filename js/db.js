// Único punto de acceso a IndexedDB. El resto de módulos no abre la base directamente.

// Nombre y versión de la base. Si cambia la estructura, hay que subir DB_VERSION.
const DB_NAME = 'NotasDefinitivasDB';
const DB_VERSION = 1;

// Nombres de los almacenes, centralizados para evitar errores de escritura.
export const STORES = {
  USUARIOS: 'usuarios',   // llave: documento (texto, conserva ceros iniciales)
  SESIONES: 'sesiones',   // llave: id (registro 'activa')
  CALCULOS: 'calculos',   // llave: id autoincremental
};

// Guarda la promesa para no abrir la base más de una vez.
let dbPromise = null;

// Comprueba si el navegador soporta IndexedDB (requisito de HU-04.1 CA-03).
export function isIndexedDBSupported() {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

// Abre la base de datos y crea los almacenes si no existen.
export function abrirBaseDatos() {
  if (dbPromise) return dbPromise;

  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB no está disponible en este navegador'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Solo se ejecuta cuando la base se crea o cambia de versión.
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.USUARIOS)) {
        db.createObjectStore(STORES.USUARIOS, { keyPath: 'documento' });
      }
      if (!db.objectStoreNames.contains(STORES.SESIONES)) {
        db.createObjectStore(STORES.SESIONES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CALCULOS)) {
        db.createObjectStore(STORES.CALCULOS, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // Si otra pestaña necesita actualizar la versión, esta conexión se cierra
      // para no bloquearla. Luego, la próxima llamada volverá a abrir la base.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      reject(new Error('La base de datos está bloqueada por otra pestaña abierta'));
    };
  });

  return dbPromise;
}
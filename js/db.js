// Único punto de acceso a IndexedDB.

const DB_NAME = 'NotasDefinitivasDB';
const DB_VERSION = 1;

export const STORES = {
  USUARIOS: 'usuarios',
  SESIONES: 'sesiones',
  CALCULOS: 'calculos',
};

let dbPromise = null;

export function isIndexedDBSupported() {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

export function abrirBaseDatos() {
  if (dbPromise) return dbPromise;

  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB no está disponible en este navegador'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Solo se ejecuta si la base es nueva o su versión es menor a DB_VERSION.
    // oldVersion indica desde qué versión viene el navegador del estudiante.
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const versionAnterior = event.oldVersion;

      // Versión 1: creación inicial de los almacenes
      if (versionAnterior < 1) {
        db.createObjectStore(STORES.USUARIOS, { keyPath: 'documento' });
        db.createObjectStore(STORES.SESIONES, { keyPath: 'id' });
        db.createObjectStore(STORES.CALCULOS, { keyPath: 'id', autoIncrement: true });
      }

      // Versión 2: sin cambios de estructura (se agregó definitivaExacta al registro,
      // que no es un cambio de almacenes ni de llaves).
    };

    request.onsuccess = () => {
      const db = request.result;

      // Si otra pestaña necesita actualizar la versión, cerramos esta conexión.
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
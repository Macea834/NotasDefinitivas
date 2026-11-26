// Cálculo de la definitiva (HU-3.1) y guardado del historial (HU-3.2).
import { abrirBaseDatos, STORES } from './db.js';

const RANGO_NOTA = { min: 0, max: 5 };
const RANGO_PORCENTAJE = { min: 0, max: 100 };
const NOTA_APROBACION = 3.0;

// Valida sin cambiar nada. Devuelve { ok, mensajes, notasFueraDeRango }.
export function validarEvaluaciones(evaluaciones) {
  const mensajes = [];
  const notasFueraDeRango = [];

  // FA-03: campos vacíos o no numéricos
  const incompletas = evaluaciones.some((e) => e.nota === null || e.porcentaje === null);
  if (incompletas) {
    mensajes.push('Completa todas las notas y porcentajes antes de calcular.');
  }

  // FA-02: nota fuera de 0.0 a 5.0. Porcentaje fuera de 0 a 100.
  evaluaciones.forEach((e) => {
    if (e.nota !== null && (e.nota < RANGO_NOTA.min || e.nota > RANGO_NOTA.max)) {
      notasFueraDeRango.push(e.indice);
    }
    if (e.porcentaje !== null && (e.porcentaje < RANGO_PORCENTAJE.min || e.porcentaje > RANGO_PORCENTAJE.max)) {
      mensajes.push(`El porcentaje ${e.indice} debe estar entre 0 y 100.`);
    }
  });
  if (notasFueraDeRango.length > 0) {
    mensajes.push(`Las notas deben estar entre 0.0 y 5.0. Revisa: ${notasFueraDeRango.join(', ')}.`);
  }

  // FA-01: los porcentajes deben sumar exactamente 100%.
  if (!incompletas) {
    const suma = Math.round(evaluaciones.reduce((acc, e) => acc + e.porcentaje, 0) * 100) / 100;
    if (suma !== 100) {
      const diferencia = Math.round(Math.abs(100 - suma) * 100) / 100;
      mensajes.push(
        suma < 100
          ? `Los porcentajes suman ${suma}%. Faltan ${diferencia}%.`
          : `Los porcentajes suman ${suma}%. Sobran ${diferencia}%.`
      );
    }
  }

  return { ok: mensajes.length === 0, mensajes, notasFueraDeRango };
}

// Calcula la definitiva y el estado. Requiere que la validación haya pasado.
// El estado se decide con el valor exacto, sin redondear (decisión confirmada en HU-3.1).
export function calcularResultado(evaluaciones) {
  // definitiva = suma de (nota × porcentaje / 100)
  const bruta = evaluaciones.reduce((acc, e) => acc + (e.nota * e.porcentaje) / 100, 0);

  // Se quita solo el ruido de punto flotante para comparar con 3.0.
  const comparable = Number(bruta.toFixed(10));
  const estado = comparable >= NOTA_APROBACION ? 'Aprobado' : 'Reprobado';

  return {
    definitiva: Math.round(bruta * 100) / 100,  // se muestra con 2 decimales
    exacta: Math.round(bruta * 10000) / 10000,  // valor exacto con hasta 4 decimales
    estado,
  };
}

// Guarda un cálculo válido. Cada llamada crea un registro nuevo (HU-3.2).
export async function guardarCalculo(documento, evaluaciones, resultado) {
  const db = await abrirBaseDatos();

  const registro = {
    documento,
    notas: evaluaciones.map((e) => e.nota),
    porcentajes: evaluaciones.map((e) => e.porcentaje),
    definitiva: resultado.definitiva,
    definitivaExacta: resultado.exacta,
    estado: resultado.estado,
    fechaHora: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULOS, 'readwrite');
    const peticion = tx.objectStore(STORES.CALCULOS).add(registro);
    tx.oncomplete = () => resolve(peticion.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });
}
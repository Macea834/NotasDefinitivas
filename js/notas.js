// Generación de filas de evaluación (HU-2). El estado vive solo en memoria.

const LIMITE_CANTIDAD = 20;

let evaluaciones = [];

const contenedor = document.getElementById('contenedor-evaluaciones');
const acumuladoEl = document.getElementById('acumulado');
const alertasEl = document.getElementById('alertas-notas');

function mostrarAlerta(texto) {
  alertasEl.textContent = texto;
}

export function validarCantidad(texto) {
  const limpio = String(texto ?? '').trim();
  const formatoEntero = /^\d+(\.0+)?$/;

  if (!formatoEntero.test(limpio)) {
    return { ok: false, mensaje: `Ingresa un número entero entre 1 y ${LIMITE_CANTIDAD}.` };
  }

  const numero = parseInt(limpio, 10);
  if (numero < 1 || numero > LIMITE_CANTIDAD) {
    return { ok: false, mensaje: `Ingresa un número entero entre 1 y ${LIMITE_CANTIDAD}.` };
  }

  return { ok: true, valor: numero };
}

function crearInput(campo, indice, min, max) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = `${campo}-${indice}`;
  input.step = 'any';
  input.min = String(min);
  input.max = String(max);
  input.dataset.campo = campo;
  input.dataset.indice = String(indice);
  return input;
}

function crearFila(evaluacion) {
  const fila = document.createElement('div');
  fila.className = 'fila-evaluacion';

  const etiquetaNota = document.createElement('label');
  etiquetaNota.htmlFor = `nota-${evaluacion.indice}`;
  etiquetaNota.textContent = `Nota ${evaluacion.indice}`;

  const etiquetaPorcentaje = document.createElement('label');
  etiquetaPorcentaje.htmlFor = `porcentaje-${evaluacion.indice}`;
  etiquetaPorcentaje.textContent = `Porcentaje ${evaluacion.indice} (%)`;

  fila.append(
    etiquetaNota,
    crearInput('nota', evaluacion.indice, 0, 5),
    etiquetaPorcentaje,
    crearInput('porcentaje', evaluacion.indice, 0, 100)
  );

  contenedor.append(fila);
}

export function calcularAcumulado() {
  const total = evaluaciones.reduce((suma, ev) => suma + (ev.porcentaje ?? 0), 0);
  return Math.round(total * 100) / 100;
}

function actualizarAcumulado() {
  acumuladoEl.textContent = String(calcularAcumulado());
}

export function generarFilas(textoCantidad) {
  const validacion = validarCantidad(textoCantidad);

  if (!validacion.ok) {
    mostrarAlerta(validacion.mensaje);
    return;
  }

  const cantidad = validacion.valor;

  // Misma cantidad: se conservan filas y valores.
  if (cantidad === evaluaciones.length) {
    mostrarAlerta('');
    return;
  }

  // Cantidad distinta: se reinician las filas.
  evaluaciones = Array.from({ length: cantidad }, (_, i) => ({
    indice: i + 1,
    nota: null,
    porcentaje: null,
  }));

  contenedor.replaceChildren();
  mostrarAlerta('');
  evaluaciones.forEach(crearFila);
  actualizarAcumulado();
}

// Devuelve las evaluaciones actuales para el cálculo.
export function obtenerEvaluaciones() {
  return evaluaciones;
}

// Marca en rojo las notas indicadas (FA-02) y quita la marca a las demás.
export function marcarNotasFueraDeRango(indices) {
  contenedor.querySelectorAll('[data-campo="nota"]').forEach((input) => {
    input.classList.toggle('fuera-de-rango', indices.includes(Number(input.dataset.indice)));
  });
}

// Un solo listener en el contenedor atiende todos los campos (delegación de eventos).
contenedor.addEventListener('input', (evento) => {
  const { campo, indice } = evento.target.dataset;
  if (!campo) return;

  const evaluacion = evaluaciones[Number(indice) - 1];
  const numero = evento.target.value === '' ? NaN : Number(evento.target.value);

  evaluacion[campo] = Number.isFinite(numero) ? numero : null;
  actualizarAcumulado();

  // Marca visual al escribir (no bloquea). El bloqueo real está en el cálculo.
  if (campo === 'nota') {
    const fueraDeRango = evaluacion.nota !== null && (evaluacion.nota < 0 || evaluacion.nota > 5);
    evento.target.classList.toggle('fuera-de-rango', fueraDeRango);
  }
});
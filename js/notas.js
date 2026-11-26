// Generación de filas de evaluación (HU-2). El estado vive solo en memoria:
// esta historia no guarda nada en IndexedDB (CA-06 de HU-2).

const LIMITE_CANTIDAD = 20; // decisión del proyecto, confirmada en HU-2

// Una entrada por evaluación: { indice, nota, porcentaje }. null = campo vacío.
let evaluaciones = [];

const contenedor = document.getElementById('contenedor-evaluaciones');
const acumuladoEl = document.getElementById('acumulado');
const alertasEl = document.getElementById('alertas-notas');

function mostrarAlerta(texto) {
  alertasEl.textContent = texto;
}

// Acepta solo enteros escritos como "3" o "3.0" (CA-02). Rechaza "2.5", "1e1", "-1" y texto.
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

// Crea un input numérico con sus atributos y datos para identificarlo después.
function crearInput(campo, indice, min, max) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = `${campo}-${indice}`;
  input.step = 'any';
  input.min = String(min);
  input.max = String(max);
  input.dataset.campo = campo;      // 'nota' o 'porcentaje'
  input.dataset.indice = String(indice);
  return input;
}

// Dibuja una fila: etiqueta y campo de nota, etiqueta y campo de porcentaje.
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

// Suma los porcentajes ingresados. Se redondea a 2 decimales para evitar
// errores de punto flotante, como 0.1 + 0.2 = 0.30000000000000004.
export function calcularAcumulado() {
  const total = evaluaciones.reduce((suma, ev) => suma + (ev.porcentaje ?? 0), 0);
  return Math.round(total * 100) / 100;
}

function actualizarAcumulado() {
  acumuladoEl.textContent = String(calcularAcumulado());
}

// Genera las filas según la cantidad indicada (HU-2, CA-01 a CA-04).
export function generarFilas(textoCantidad) {
  const validacion = validarCantidad(textoCantidad);

  // CA-02: cantidad inválida. No se toca nada de lo que ya existe.
  if (!validacion.ok) {
    mostrarAlerta(validacion.mensaje);
    return;
  }

  const cantidad = validacion.valor;

  // CA-04: misma cantidad. Se conservan filas y valores.
  if (cantidad === evaluaciones.length) {
    mostrarAlerta('');
    return;
  }

  // CA-03: cantidad distinta. Se limpia todo y se crean filas vacías.
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

// CA-05: un solo listener en el contenedor atiende todos los campos,
// incluso los que se crean después.
contenedor.addEventListener('input', (evento) => {
  const { campo, indice } = evento.target.dataset;
  if (!campo) return;

  const evaluacion = evaluaciones[Number(indice) - 1];
  const numero = evento.target.value === '' ? NaN : Number(evento.target.value);

  // Se guarda null si el campo está vacío o no es numérico.
  evaluacion[campo] = Number.isFinite(numero) ? numero : null;
  actualizarAcumulado();

  // Marca visualmente la nota fuera de rango (FA-02). No bloquea la escritura.
  if (campo === 'nota') {
    const fueraDeRango = evaluacion.nota !== null && (evaluacion.nota < 0 || evaluacion.nota > 5);
    evento.target.classList.toggle('fuera-de-rango', fueraDeRango);
  }
});
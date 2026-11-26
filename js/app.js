// Punto de entrada: conecta la interfaz con la lógica.
import { isIndexedDBSupported } from './db.js';
import {
  validarDocumento,
  iniciarSesion,
  obtenerSesionActiva,
  usuarioExiste,
} from './acceso.js';
import { generarFilas, obtenerEvaluaciones, marcarNotasFueraDeRango } from './notas.js';
import { validarEvaluaciones, calcularResultado, guardarCalculo } from './calculo.js';

const $ = (id) => document.getElementById(id);

const vistas = {
  acceso: $('vista-acceso'),
  notas: $('vista-notas'),
  historial: $('vista-historial'),
};

function mostrarVista(nombre) {
  for (const [clave, elemento] of Object.entries(vistas)) {
    elemento.classList.toggle('oculta', clave !== nombre);
  }
}

function mostrarAlerta(texto) {
  $('alerta-acceso').textContent = texto;
}

// HU-1: valida el documento, registra o recupera la sesión y muestra el panel.
async function ingresar() {
  mostrarAlerta('');

  const resultado = validarDocumento($('documento').value);
  if (!resultado.ok) {
    mostrarAlerta(resultado.mensaje);
    $('documento').focus();
    return;
  }

  try {
    const { nuevo } = await iniciarSesion(resultado.valor);
    console.info(nuevo ? 'Usuario registrado' : 'Sesión recuperada', resultado.valor);
    mostrarVista('notas');
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    mostrarAlerta('No fue posible iniciar la sesión. Intenta de nuevo.');
  }
}

// Al cargar: si hay sesión activa y el usuario existe, va directo al panel.
async function restaurarSesion() {
  if (!isIndexedDBSupported()) {
    mostrarAlerta('Tu navegador no es compatible con IndexedDB.');
    return;
  }

  try {
    const sesion = await obtenerSesionActiva();
    if (sesion && (await usuarioExiste(sesion.documento))) {
      mostrarVista('notas');
    }
  } catch (error) {
    console.error('Error al restaurar la sesión:', error);
    mostrarAlerta('No fue posible recuperar tu sesión.');
  }
}

// HU-3.1 y HU-3.2: valida, calcula, muestra y guarda.
async function calcular() {
  const evaluaciones = obtenerEvaluaciones();
  const validacion = validarEvaluaciones(evaluaciones);

  marcarNotasFueraDeRango(validacion.notasFueraDeRango);

  // Si algo está mal, no se calcula ni se guarda (CA-04 de HU-3.1).
  if (!validacion.ok) {
    $('alertas-notas').textContent = validacion.mensajes.join(' ');
    $('resultado').textContent = '';
    return;
  }

  const resultado = calcularResultado(evaluaciones);
  $('alertas-notas').textContent = '';

  // Si el redondeo cambia la lectura, se muestra también el valor exacto.
  const textoExacto = resultado.definitiva !== resultado.exacta
    ? `. Valor exacto: ${resultado.exacta}`
    : '';
  const texto = `Nota definitiva: ${resultado.definitiva.toFixed(2)} (${resultado.estado})${textoExacto}`;
  $('resultado').textContent = texto;

  try {
    const sesion = await obtenerSesionActiva();
    if (!sesion) throw new Error('No hay sesión activa');
    await guardarCalculo(sesion.documento, evaluaciones, resultado);
    $('resultado').textContent = `${texto}. Guardado en el historial.`;
  } catch (error) {
    console.error('Error al guardar el cálculo:', error);
    $('alertas-notas').textContent = 'No fue posible guardar el resultado en el historial.';
  }
}

$('btn-ingresar').addEventListener('click', ingresar);
$('documento').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') ingresar();
});

$('btn-generar').addEventListener('click', () => generarFilas($('cantidad').value));
$('cantidad').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') generarFilas($('cantidad').value);
});

$('btn-calcular').addEventListener('click', calcular);

restaurarSesion();
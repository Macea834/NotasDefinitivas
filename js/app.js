// Punto de entrada: conecta la interfaz con la lógica de acceso.
import { isIndexedDBSupported } from './db.js';
import {
  validarDocumento,
  iniciarSesion,
  obtenerSesionActiva,
  usuarioExiste,
} from './acceso.js';

const $ = (id) => document.getElementById(id);

const vistas = {
  acceso: $('vista-acceso'),
  notas: $('vista-notas'),
  historial: $('vista-historial'),
};

// Muestra una sola vista y oculta las demás.
function mostrarVista(nombre) {
  for (const [clave, elemento] of Object.entries(vistas)) {
    elemento.classList.toggle('oculta', clave !== nombre);
  }
}

function mostrarAlerta(texto) {
  $('alerta-acceso').textContent = texto;
}

// Flujo de HU-1: valida el documento, registra o recupera y muestra el panel.
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

// Al cargar la página: si hay sesión activa y el usuario existe, va directo al panel.
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

$('btn-ingresar').addEventListener('click', ingresar);

// Enter en el campo también envía el formulario.
$('documento').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') ingresar();
});

restaurarSesion();
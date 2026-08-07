const boton = document.querySelector('button');
const botonUbicacion = document.getElementById('btn-ubicacion');
const input = document.querySelector('input');
const mensajeEstado = document.getElementById('mensaje-estado');
const spinner = document.getElementById('spinner');
const estadoVacio = document.getElementById('estado-vacio');
const climaActual = document.getElementById('clima-actual');
const pronosticoHoras = document.getElementById('pronostico-horas');

const CLAVE_ULTIMA_CIUDAD = 'ultimaCiudadBuscada';

function mostrarMensaje(texto, esError = false) {
  mensajeEstado.textContent = texto;
  mensajeEstado.classList.toggle('error', esError);
}

function ponerCargando(cargando) {
  boton.disabled = cargando;
  spinner.classList.toggle('activo', cargando);
}

/**
 * Orquesta los tres proveedores:
 * 1. Intenta Open-Meteo (principal).
 * 2. Si falla, intenta OpenWeather (respaldo).
 * 3. Si cualquiera de los dos tiene éxito, pide a WeatherAPI datos extra
 *    (UV / calidad del aire) como mejor esfuerzo: si eso falla, no pasa nada.
 */
async function obtenerClima({ ciudadTexto, coords }) {
  let resultado;
  let coordsFinal = coords;

  try {
    if (ciudadTexto) {
      const geo = await geocodificarCiudad(ciudadTexto);
      coordsFinal = { lat: geo.lat, lon: geo.lon };
      resultado = await climaOpenMeteo(geo.lat, geo.lon, geo.nombre, geo.pais);
    } else {
      resultado = await climaOpenMeteo(coords.lat, coords.lon);
    }
  } catch (errorPrincipal) {
    try {
      resultado = ciudadTexto
        ? await climaOpenWeatherPorCiudad(ciudadTexto)
        : await climaOpenWeatherPorCoords(coords.lat, coords.lon);
      coordsFinal = { lat: resultado.lat, lon: resultado.lon };
    } catch (errorRespaldo) {
      if (errorRespaldo.message === 'CIUDAD_NO_ENCONTRADA') throw errorRespaldo;
      throw new Error('SIN_DATOS');
    }
  }

  resultado.extra = await datosExtra(coordsFinal.lat, coordsFinal.lon);
  return resultado;
}

function renderClima(datos) {
  document.querySelector('.current-weather h3').textContent = datos.pais
    ? `${datos.ciudad}, ${datos.pais}`
    : datos.ciudad;

  document.querySelector('.current-weather h1').textContent = `${Math.round(datos.temp)}°`;
  document.getElementById('descripcion').textContent = datos.descripcion;
  document.getElementById('sensacion').textContent = `Sensación: ${Math.round(datos.sensacion)}°`;
  document.getElementById('humedad').textContent = `Humedad: ${Math.round(datos.humedad)}%`;
  document.getElementById('viento').textContent = `Viento: ${datos.vientoKmh.toFixed(1)} km/h`;
  document.getElementById('prec').textContent = `Precipitación: ${datos.precipitacion} mm`;

  document.getElementById('icono-clima').src = `https://openweathermap.org/img/wn/${datos.icono}@2x.png`;
  document.getElementById('icono-clima').alt = datos.descripcion;

  // Datos extra (WeatherAPI): solo se muestran si llegaron
  const uvEl = document.getElementById('uv');
  if (datos.extra && datos.extra.uv != null) {
    uvEl.textContent = `Índice UV: ${Math.round(datos.extra.uv)}`;
    uvEl.classList.remove('oculto');
  } else {
    uvEl.classList.add('oculto');
  }

  const aireEl = document.getElementById('aire');
  if (datos.extra && datos.extra.aireTexto) {
    aireEl.textContent = `Calidad del aire: ${datos.extra.aireTexto}`;
    aireEl.classList.remove('oculto');
  } else {
    aireEl.classList.add('oculto');
  }

  // Transparencia: si se usó el respaldo, lo indicamos discretamente
  const fuenteEl = document.getElementById('fuente-datos');
  if (datos.fuente === 'openweather') {
    fuenteEl.textContent = 'Datos de respaldo (OpenWeather)';
    fuenteEl.classList.remove('oculto');
  } else {
    fuenteEl.classList.add('oculto');
  }

  mostrarHoras(datos.horas);
  mostrarDias(datos.dias);

  mostrarMensaje('');
  estadoVacio.classList.add('oculto');
  climaActual.classList.remove('oculto');
  pronosticoHoras.classList.remove('oculto');

  localStorage.setItem(CLAVE_ULTIMA_CIUDAD, datos.ciudad);
  input.value = datos.ciudad;
}

async function cargarClima(opciones) {
  ponerCargando(true);
  mostrarMensaje(opciones.ciudadTexto ? 'Buscando...' : 'Buscando el clima de tu ubicación...');

  try {
    const datos = await obtenerClima(opciones);
    renderClima(datos);
  } catch (error) {
    mostrarMensaje(
      error.message === 'CIUDAD_NO_ENCONTRADA'
        ? 'Ciudad no encontrada.'
        : 'No se pudo obtener el clima. Comprueba tu conexión e inténtalo de nuevo.',
      true
    );
  } finally {
    ponerCargando(false);
  }
}

async function buscarClima() {
  const city = input.value.trim();
  if (!city) {
    mostrarMensaje('Escribe una ciudad para buscar.', true);
    return;
  }

  await cargarClima({ ciudadTexto: city });
}

function buscarPorUbicacion() {
  if (!navigator.geolocation) {
    mostrarMensaje('Tu navegador no admite geolocalización.', true);
    return;
  }

  ponerCargando(true);
  mostrarMensaje('Obteniendo tu ubicación...');

  navigator.geolocation.getCurrentPosition(
    async (posicion) => {
      const { latitude, longitude } = posicion.coords;
      await cargarClima({ coords: { lat: latitude, lon: longitude } });
    },
    (error) => {
      const mensajes = {
        1: 'Permiso de ubicación denegado.',
        2: 'No se pudo determinar tu ubicación.',
        3: 'Se agotó el tiempo para obtener tu ubicación.',
      };
      mostrarMensaje(mensajes[error.code] || 'No se pudo obtener tu ubicación.', true);
      ponerCargando(false);
    }
  );
}

botonUbicacion.addEventListener('click', buscarPorUbicacion);

boton.addEventListener('click', buscarClima);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    buscarClima();
  }
});

// Al recargar la página, si hay una ciudad guardada, la buscamos automáticamente
const ultimaCiudad = localStorage.getItem(CLAVE_ULTIMA_CIUDAD);
if (ultimaCiudad) {
  input.value = ultimaCiudad;
  buscarClima();
}

const fecha = new Date();
const opciones = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};
document.getElementById('fecha').textContent =
  fecha.toLocaleDateString('es-ES', opciones);

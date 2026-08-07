/**
 * Módulo de proveedores de clima.
 *
 * Estrategia:
 * 1. Open-Meteo es el proveedor principal (gratis, sin API key, buen límite de uso).
 * 2. Si Open-Meteo falla (red, servidor caído, etc.), se usa OpenWeather como respaldo.
 * 3. WeatherAPI se consulta aparte, solo para datos extra (índice UV y calidad del
 *    aire) que ni Open-Meteo ni OpenWeather dan gratis. Si falla, no rompe la app.
 *
 * Todas las funciones devuelven (o reciben) el mismo objeto "clima normalizado":
 * {
 *   ciudad, pais, lat, lon,
 *   temp, sensacion, humedad, vientoKmh, precipitacion,
 *   descripcion, icono,        // icono en formato OpenWeatherMap, ej. "01d"
 *   horas: [{ horaTexto, temp, icono }],
 *   dias:  [{ nombreDia, tempMax, tempMin, icono, esHoy }],
 *   fuente: "open-meteo" | "openweather",
 * }
 */

// ---------- Utilidades ----------

function fechaLocalISO(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// ---------- Open-Meteo (principal) ----------

const DESCRIPCIONES_WMO = {
  0: 'cielo despejado', 1: 'principalmente despejado', 2: 'parcialmente nublado', 3: 'nublado',
  45: 'niebla', 48: 'niebla con escarcha',
  51: 'llovizna ligera', 53: 'llovizna moderada', 55: 'llovizna intensa',
  56: 'llovizna helada', 57: 'llovizna helada intensa',
  61: 'lluvia ligera', 63: 'lluvia moderada', 65: 'lluvia intensa',
  66: 'lluvia helada', 67: 'lluvia helada intensa',
  71: 'nevada ligera', 73: 'nevada moderada', 75: 'nevada intensa', 77: 'granizado fino',
  80: 'chubascos ligeros', 81: 'chubascos moderados', 82: 'chubascos violentos',
  85: 'chubascos de nieve ligeros', 86: 'chubascos de nieve intensos',
  95: 'tormenta eléctrica', 96: 'tormenta con granizo ligero', 99: 'tormenta con granizo intenso',
};

const ICONOS_WMO = {
  0: '01', 1: '02', 2: '03', 3: '04',
  45: '50', 48: '50',
  51: '09', 53: '09', 55: '09', 56: '09', 57: '09',
  61: '10', 63: '10', 65: '10',
  66: '13', 67: '13',
  71: '13', 73: '13', 75: '13', 77: '13',
  80: '09', 81: '09', 82: '09',
  85: '13', 86: '13',
  95: '11', 96: '11', 99: '11',
};

function mapaIconoWMO(codigo, esDia) {
  const base = ICONOS_WMO[codigo] || '03';
  return `${base}${esDia ? 'd' : 'n'}`;
}

function descripcionWMO(codigo) {
  return DESCRIPCIONES_WMO[codigo] || 'condiciones variables';
}

async function geocodificarCiudad(nombre) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('ERROR_OPEN_METEO');

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('CIUDAD_NO_ENCONTRADA');
  }

  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, nombre: r.name, pais: r.country_code || r.country || '' };
}

async function climaOpenMeteo(lat, lon, nombreCiudad, pais) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('ERROR_OPEN_METEO');

  const data = await res.json();
  if (!data.current || !data.hourly || !data.daily) throw new Error('ERROR_OPEN_METEO');

  const actual = data.current;
  const esDiaAhora = actual.is_day === 1;

  const ahora = new Date();
  let inicio = data.hourly.time.findIndex((t) => new Date(t) >= ahora);
  if (inicio === -1) inicio = 0;

  const horas = [];
  for (let i = inicio; horas.length < 8 && i < data.hourly.time.length; i += 3) {
    const fechaHora = new Date(data.hourly.time[i]);
    const horaDelDia = fechaHora.getHours();
    horas.push({
      horaTexto: `${horaDelDia}:00`,
      temp: data.hourly.temperature_2m[i],
      icono: mapaIconoWMO(data.hourly.weather_code[i], horaDelDia >= 6 && horaDelDia < 20),
    });
  }

  const hoyTexto = fechaLocalISO(new Date());
  const dias = data.daily.time.slice(0, 6).map((fechaTexto, i) => ({
    nombreDia: new Date(fechaTexto).toLocaleDateString('es-ES', { weekday: 'short' }),
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    icono: mapaIconoWMO(data.daily.weather_code[i], true),
    esHoy: fechaTexto === hoyTexto,
  }));

  return {
    ciudad: nombreCiudad || 'Tu ubicación',
    pais: pais || '',
    lat, lon,
    temp: actual.temperature_2m,
    sensacion: actual.apparent_temperature,
    humedad: actual.relative_humidity_2m,
    vientoKmh: actual.wind_speed_10m,
    precipitacion: actual.precipitation ?? 0,
    descripcion: descripcionWMO(actual.weather_code),
    icono: mapaIconoWMO(actual.weather_code, esDiaAhora),
    horas,
    dias,
    fuente: 'open-meteo',
  };
}

// ---------- OpenWeather (respaldo mediante función Serverless) ----------

function agruparPronosticoDiarioOWM(lista) {
  const porDia = {};
  lista.forEach((item) => {
    const fecha = item.dt_txt.split(' ')[0];
    if (!porDia[fecha]) porDia[fecha] = [];
    porDia[fecha].push(item);
  });

  const hoyTexto = fechaLocalISO(new Date());

  return Object.keys(porDia)
    .slice(0, 6)
    .map((fecha) => {
      const items = porDia[fecha];
      const temps = items.map((i) => i.main.temp);
      return {
        nombreDia: new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short' }),
        tempMax: Math.max(...temps),
        tempMin: Math.min(...temps),
        icono: items[0].weather[0].icon,
        esHoy: fecha === hoyTexto,
      };
    });
}

async function _climaOpenWeather(queryParams) {
  const res = await fetch(`/api/clima?provider=openweather&${queryParams}`);
  if (!res.ok) throw new Error('ERROR_OPENWEATHER');

  const { weather, forecast } = await res.json();

  if (Number(weather.cod) !== 200) {
    throw new Error(weather.cod === 404 || weather.cod === '404' ? 'CIUDAD_NO_ENCONTRADA' : 'ERROR_OPENWEATHER');
  }

  if (Number(forecast.cod) !== 200) throw new Error('ERROR_OPENWEATHER');

  const horas = forecast.list.slice(0, 8).map((item) => ({
    horaTexto: `${new Date(item.dt * 1000).getHours()}:00`,
    temp: item.main.temp,
    icono: item.weather[0].icon,
  }));

  return {
    ciudad: weather.name,
    pais: weather.sys.country,
    lat: weather.coord.lat,
    lon: weather.coord.lon,
    temp: weather.main.temp,
    sensacion: weather.main.feels_like,
    humedad: weather.main.humidity,
    vientoKmh: weather.wind.speed * 3.6,
    precipitacion: weather.rain ? weather.rain['1h'] : 0,
    descripcion: weather.weather[0].description,
    icono: weather.weather[0].icon,
    horas,
    dias: agruparPronosticoDiarioOWM(forecast.list),
    fuente: 'openweather',
  };
}

function climaOpenWeatherPorCiudad(city) {
  return _climaOpenWeather(`city=${encodeURIComponent(city)}`);
}

function climaOpenWeatherPorCoords(lat, lon) {
  return _climaOpenWeather(`lat=${lat}&lon=${lon}`);
}

// ---------- WeatherAPI (datos extra mediante función Serverless) ----------

const TEXTOS_CALIDAD_AIRE = {
  1: 'Buena', 2: 'Moderada', 3: 'Dañina (grupos sensibles)', 4: 'Dañina', 5: 'Muy dañina', 6: 'Peligrosa',
};

async function datosExtra(lat, lon) {
  try {
    const res = await fetch(`/api/clima?provider=weatherapi&lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.current) return null;

    const indiceAire = data.current.air_quality ? Math.round(data.current.air_quality['us-epa-index']) : null;

    return {
      uv: data.current.uv,
      aireIndice: indiceAire,
      aireTexto: TEXTOS_CALIDAD_AIRE[indiceAire] || null,
    };
  } catch (error) {
    return null; // best-effort: cualquier fallo aquí nunca debe romper la app
  }
}

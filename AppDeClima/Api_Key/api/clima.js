export default async function handler(req, res) {
  const { provider, city, lat, lon } = req.query;

  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
  const WEATHERAPI_API_KEY = process.env.WEATHERAPI_API_KEY;

  try {
    if (provider === 'openweather') {
      let url = '';
      let forecastUrl = '';

      if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
      } else if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
      } else {
        return res.status(400).json({ error: 'Parámetros insuficientes' });
      }

      const weatherRes = await fetch(url);
      const weatherData = await weatherRes.json();

      const forecastRes = await fetch(forecastUrl);
      const forecastData = await forecastRes.json();

      return res.status(200).json({ weather: weatherData, forecast: forecastData });
    } 

    if (provider === 'weatherapi') {
      if (!lat || !lon) {
        return res.status(400).json({ error: 'Se requieren latitud y longitud' });
      }

      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_API_KEY}&q=${lat},${lon}&aqi=yes`;
      const response = await fetch(url);
      const data = await response.json();

      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Proveedor no soportado' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el servicio de clima' });
  }
}

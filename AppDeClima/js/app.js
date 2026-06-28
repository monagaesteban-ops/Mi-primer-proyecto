document.querySelector('button').addEventListener('click', () => {
    const city = document.querySelector('input').value;
    if (!city) {
    alert("Escribe una ciudad, genio.");
    return;
}
    const apiKey = 'ca9a1ca2c653455ee55261e613d15850';
    const Url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=es`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=es`;
    // const data = await res.json();
    
const sensacion = document.getElementById('sensacion')
const humedad = document.getElementById('humedad')
const viento = document.getElementById('viento')
const prec = document.getElementById('prec')



fetch(Url)
        .then(res => res.json())
        .then(data => {
 
            if (data.cod != 200) {
                alert("Ciudad no encontrada");
                return;
            }

            document.querySelector('.current-weather h3')
                .textContent = `${data.name}, ${data.sys.country}`;

            document.querySelector('.current-weather h1')
                .textContent = `${Math.round(data.main.temp)}°`;

            document.getElementById('descripcion')
                .textContent = data.weather[0].description;

            document.getElementById('sensacion')
                .textContent = `Sensación térmica: ${Math.round(data.main.feels_like)}°`;

            document.getElementById('humedad')
                .textContent = `Humedad: ${data.main.humidity}%`;
                
            document.getElementById('viento')
                .textContent = `Viento: ${data.wind.speed.toFixed(1)} km/h`;

            document.getElementById('prec')
                .textContent =
                    `Precipitación: ${data.rain ? data.rain['1h'] + ' mm' : '0 mm'}`;

            const icono = document.getElementById('icono-clima');        
            const icon = data.weather[0].icon;

            document.getElementById('icono-clima').src =
                `https://openweathermap.org/img/wn/${icon}@2x.png`;

                
        //  console.log(data.weather[0].icon);

                
    fetch(forecastUrl)
        .then(response => response.json())
        .then(forecastData => {

            mostrarHoras(forecastData.list);

            mostrarDias(forecastData.list);

        });

        
const container = document.querySelector(".daily-forecast-container");
        });

});

const fecha = new Date();

const opciones = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
};

const fechaFormateada =
    fecha.toLocaleDateString('es-ES', opciones);

document.getElementById('fecha')
 .textContent = fechaFormateada;

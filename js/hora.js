function mostrarHoras(lista) {
  const contenedor = document.querySelector(".hourly-container");
  contenedor.innerHTML = "";

  lista.slice(0, 8).forEach(item => {
    const fecha = new Date(item.dt * 1000);
    const hora = fecha.getHours();
    const temp = Math.round(item.main.temp);
    const icon = item.weather[0].icon;

    const card = document.createElement("div");
    card.classList.add("hour-card");

    card.innerHTML = `
      <p>${hora}:00</p>
      <img src="https://openweathermap.org/img/wn/${icon}.png" />
      <p>${temp}°</p>
    `;

    contenedor.appendChild(card);
  });
}

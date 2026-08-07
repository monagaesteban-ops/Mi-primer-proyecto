function mostrarDias(dias) {
  const contenedor = document.querySelector(".daily-forecast-container");
  contenedor.innerHTML = "";

  dias.forEach(dia => {
    const card = document.createElement("div");
    card.classList.add("day-card");

    if (dia.esHoy) {
      card.classList.add("day-card-actual");
    }

    card.innerHTML = `
      <p>${dia.nombreDia}</p>
      <img src="https://openweathermap.org/img/wn/${dia.icono}.png" />
      <p>${Math.round(dia.tempMax)}° / ${Math.round(dia.tempMin)}°</p>
    `;

    contenedor.appendChild(card);
  });
}

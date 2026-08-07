function mostrarHoras(horas) {
  const contenedor = document.querySelector(".hourly-container");
  contenedor.innerHTML = "";

  horas.forEach((item, indice) => {
    const card = document.createElement("div");
    card.classList.add("hour-card");

    // El primer tramo es el más cercano a la hora actual
    if (indice === 0) {
      card.classList.add("hour-card-actual");
    }

    card.innerHTML = `
      <p>${item.horaTexto}</p>
      <img src="https://openweathermap.org/img/wn/${item.icono}.png" />
      <p>${Math.round(item.temp)}°</p>
    `;

    contenedor.appendChild(card);
  });
}

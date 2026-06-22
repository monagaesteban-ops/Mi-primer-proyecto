function mostrarDias(lista) {
  const contenedor = document.querySelector(".daily-forecast-container");
  contenedor.innerHTML = "";

  const dias = {};

  lista.forEach(item => {
    const fecha = item.dt_txt.split(" ")[0];
    if (!dias[fecha]) dias[fecha] = [];
    dias[fecha].push(item);
  });

  Object.keys(dias).slice(0, 6).forEach(dia => {
    const temps = dias[dia].map(i => i.main.temp);
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    const icon = dias[dia][0].weather[0].icon;

    const fecha = new Date(dia);
    const nombreDia = fecha.toLocaleDateString("es-ES", { weekday: "short" });

    const card = document.createElement("div");
    card.classList.add("day-card");

    card.innerHTML = `
      <p>${nombreDia}</p>
      <img src="https://openweathermap.org/img/wn/${icon}.png" />
      <p>${Math.round(max)}° / ${Math.round(min)}°</p>
    `;

    contenedor.appendChild(card);
  });
}
# 2. El mapa, en SVG dibujado en el servidor

## Contexto

El mapa colorea los más de 8.000 municipios de España según un indicador. Las opciones habituales son una librería de
mapas en el navegador (Leaflet, MapLibre) con teselas de fondo, o dibujar las formas directamente.

## Decisión

- Los contornos salen de **es-atlas** (TopoJSON de los municipios y provincias del IGN), se simplifican con
  **topojson-simplify** (se conserva el 10 % de los puntos: a este tamaño no se nota, y se simplifica la topología
  entera para que los vecinos sigan encajando), se proyectan con **d3-geo** en el servidor y salen como caminos SVG.
  El navegador no descarga ni el TopoJSON ni d3.
- **El SVG se sirve aparte** (`/mapa/[indicador]/svg`, estático y renovado con los datos) y la página lo trae
  después de pintarse. Dentro de la página, un SVG con miles de municipios enlazados iría dos veces (en el HTML y en
  los datos de React): el mapa de viviendas turísticas pesaba 4,6 MB y Lighthouse le daba 63 en rendimiento. Servido
  aparte, la página pesa 18 KB y saca 95. Los enlaces del SVG navegan con el router de Next, sin recargar.
- Los enlaces al mapa no se precargan: el menú está en todas las páginas y precargarlo costaba medio mega en cada
  visita a una ficha.
- Los municipios sin dato van todos en un solo camino: son la mayoría y no llevan ni enlace ni título.
- **Canarias** va en un recuadro con su propia proyección, como en los mapas oficiales.
- **Color por cuantiles** en seis tramos de un solo tono (legible con daltonismo y en escala de grises). «Sin dato» es
  un rayado, distinto de cualquier valor: un municipio sin índice no es un municipio barato.
- Cada municipio es un enlace a su ficha, **fuera del orden del tabulador**: con el teclado serían miles de paradas.
  El buscador y los rankings llevan a las mismas fichas.

Un detalle que costó encontrar: d3-geo espera los anillos exteriores en el sentido de las agujas del reloj, y algunos
municipios de es-atlas traen un polígono de su multipolígono al revés, que d3 dibuja como «todo el planeta menos ese
polígono». `orientar` mide el área de cada polígono por separado y le da la vuelta solo al que lo necesita (hay
prueba).

## Alternativas descartadas

- **Leaflet o MapLibre con teselas**: un fondo de calles no aporta nada a un mapa de datos, añade cientos de KB de
  JavaScript, necesita un proveedor de teselas y es más difícil de hacer accesible.
- **Canvas**: más rápido con muchas formas, pero sin enlaces ni títulos por municipio y sin texto que leer.
- **Dibujar en el cliente con d3**: el usuario tendría que descargar el TopoJSON (casi 2 MB) y d3 para ver lo mismo.
- **El SVG dentro de la página**: lo más sencillo, y como estaba al principio; ver las cifras de arriba.

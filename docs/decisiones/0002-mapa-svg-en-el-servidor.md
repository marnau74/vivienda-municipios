# 2. El mapa, en SVG dibujado en el servidor

## Contexto

El mapa colorea los más de 8.000 municipios de España según un indicador. Las opciones habituales son una librería de
mapas en el navegador (Leaflet, MapLibre) con teselas de fondo, o dibujar las formas directamente.

## Decisión

- Los contornos salen de **es-atlas** (TopoJSON de los municipios y provincias del IGN), se proyectan con **d3-geo**
  en el servidor y se envían como caminos SVG ya calculados. El navegador no descarga ni el TopoJSON ni d3.
- La geometría se calcula una vez y se guarda en caché (`'use cache'` con `cacheLife("max")`); los valores y los
  colores se aplican en cada render del mapa, que a su vez es estático y se renueva cada día.
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
- **Dibujar en el cliente con d3**: el usuario tendría que descargar el TopoJSON (varios MB) para ver lo mismo.

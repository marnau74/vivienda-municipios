# 3. Cache Components y prerenderizado parcial

## Contexto

Casi toda la web son datos que cambian dos veces al año (viviendas turísticas) o una (alquiler), y lo único que
depende de quién mira es el botón de «Seguir» y la página de la cuenta. Next.js 16 con `cacheComponents` permite
decidir qué se guarda en caché función a función y servir el resto de la página estático mientras llega lo dinámico.

## Decisión

- Todas las lecturas de datos públicos están en `src/lib/datos.ts` con `'use cache'`, `cacheLife("days")` y la
  etiqueta `ine`. Al terminar una carga, el script llama a `/api/revalidar` (con un secreto) y `revalidateTag("ine")`
  renueva todo a la vez.
- Las fichas de los municipios con índice de alquiler se generan al construir con `generateStaticParams`; las demás,
  la primera vez que alguien las pide, y se quedan en caché.
- Lo que depende de la sesión (el botón de seguir, la cuenta) va dentro de `<Suspense>` y llega por streaming. Las
  lecturas con sesión llaman antes a `connection()`, porque el cliente de Supabase mira la hora para saber si el
  token ha caducado y eso no se puede hacer al prerenderizar.
- `proxy.ts` (el antiguo `middleware`) refresca la sesión en cada petición para que las cookies no caduquen a mitad
  de un render.

## Consecuencia: el 404 de una ficha que no existe

Con el prerenderizado parcial, una URL de ficha que no se generó al construir recibe primero el esqueleto estático,
y la cabecera HTTP sale con 200 antes de que se sepa que el territorio no existe. Cuando el contenido llama a
`notFound()`, Next.js pinta la página de «No encontramos esa página» y añade `<meta name="robots" content="noindex">`;
las peticiones siguientes a la misma URL ya responden 404. Para los buscadores el resultado es el mismo (no la
indexan) y la prueba de extremo a extremo comprueba exactamente eso.

Dar un 404 desde la primera petición exigiría consultar la base en `proxy.ts` en cada visita a una ficha, antes de
la caché: más latencia en todas las fichas buenas para mejorar solo las URL mal escritas. No compensa.

## Alternativas descartadas

- **Todo dinámico** con la caché de datos: cada visita esperaría al render completo en el servidor.
- **Todo estático** (`output: "export"`): no habría cuenta ni Server Actions, y las 8.000 fichas se generarían en cada
  despliegue.

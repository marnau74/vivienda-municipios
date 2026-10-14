# Cambios

Formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con
[versionado semántico](https://semver.org/lang/es/).

## [0.1.0] - 2026-10-14

Primera versión.

### Añadido

- Carga idempotente del INE (IPVA y viviendas turísticas) en Supabase, validada con zod, y respuestas grabadas para
  las pruebas.
- Esquema con RLS, búsqueda sin tildes con trigramas y pruebas pgTAP.
- Ficha de cada territorio con la subida del alquiler frente a su provincia y España y las viviendas turísticas, con
  gráficas SVG accesibles.
- Mapa de España por municipio, rankings y comparador con el estado en la URL.
- Cuenta con enlace mágico: municipios seguidos y comparaciones guardadas.
- Tema claro y oscuro, cabeceras de seguridad y revalidación de la caché al terminar una carga.
- Pruebas unitarias, de base de datos y de extremo a extremo con axe; CI con Supabase local.

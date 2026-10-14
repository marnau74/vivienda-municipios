# 1. Supabase, con la seguridad en la base de datos (RLS)

## Contexto

La web tiene dos clases de datos: los del INE, públicos, que solo cambian cuando se carga una tabla nueva; y los de
cada usuario (municipios seguidos y comparaciones guardadas), que solo puede ver y tocar su dueño. La web lee los
dos desde el servidor de Next.js, pero la clave pública de Supabase viaja al navegador y con ella cualquiera puede
llamar a la API de Supabase directamente, sin pasar por la web.

## Decisión

- **RLS en todas las tablas**. Los datos del INE tienen una política de lectura para `anon` y `authenticated`; además
  se les **revocan** `insert`, `update`, `delete` y `truncate`, para que una política mal escrita en el futuro no
  abra la escritura. `seguimiento` y `comparacion` tienen una sola política, `usuario = auth.uid()`, para leer y
  escribir; `anon` no tiene ningún permiso sobre ellas.
- **Las vistas** (`alquiler_municipio`, `vivienda_turistica_ultima`) llevan `security_invoker`: se ejecutan con los
  permisos de quien consulta y respetan RLS.
- **La búsqueda** es una función SQL (`buscar_municipios`) con `unaccent` y trigramas: el orden (empieza por lo
  escrito, luego los que tienen índice, luego parecido) se decide junto a los datos y se prueba con pgTAP.
- **La clave de servicio**, que se salta RLS, solo la usa el script de carga. No tiene el prefijo `NEXT_PUBLIC_` y la
  web no la lee nunca.
- **Dos clientes en el servidor**: uno sin cookies para los datos públicos (se puede cachear: la respuesta es la
  misma para todos) y otro por petición con las cookies del usuario (`@supabase/ssr`). Nunca un cliente global con
  sesión, que mezclaría usuarios.
- **Pruebas en la base** (`supabase/tests/database`): un usuario no lee ni borra lo de otro, no puede crear
  filas a nombre de otro, el anónimo no ve nada privado y nadie escribe los datos del INE con la clave pública.

## Alternativas descartadas

- **Postgres propio y autenticación en Next.js** (Auth.js): más piezas que mantener, y la seguridad dependería de que
  cada consulta del código filtre por usuario. Con RLS, un olvido en el código no expone datos.
- **Filtrar por usuario solo en las Server Actions**: funciona mientras nadie llame a la API de Supabase con la clave
  pública, que es justo lo que no se puede impedir.
- **Contraseñas**: el enlace mágico evita guardar y recuperar contraseñas para una cuenta que solo guarda preferencias.

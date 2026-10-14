-- Datos del INE (públicos, solo lectura para la web) y datos de cada usuario (protegidos con RLS).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent no es IMMUTABLE (depende del diccionario): esta envoltura sí, para poder indexar el nombre sin tildes.
create function public.sin_tildes(texto text) returns text
language sql immutable parallel safe
set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, texto)) $$;

-- España, comunidades, provincias y municipios, con su código del INE.
create table public.territorio (
    codigo text primary key,
    codigo_ine text not null,
    nivel text not null check (nivel in ('pais', 'comunidad', 'provincia', 'municipio')),
    nombre text not null check (length(nombre) between 1 and 120),
    padre text references public.territorio (codigo),
    slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
    check ((nivel = 'pais') = (padre is null))
);
comment on table public.territorio is 'Territorios del INE. Código: es, c01 (comunidad), p02 (provincia), m02003 (municipio).';
create index territorio_padre on public.territorio (padre);
create index territorio_nombre_trgm on public.territorio using gin (public.sin_tildes(nombre) extensions.gin_trgm_ops);

-- Índice de precios de vivienda en alquiler (IPVA): base 2015 = 100, anual.
create table public.alquiler_indice (
    territorio text not null references public.territorio (codigo) on delete cascade,
    anio smallint not null check (anio between 2011 and 2100),
    indice numeric(8, 3) not null check (indice > 0),
    variacion_anual numeric(6, 2),
    primary key (territorio, anio)
);
comment on table public.alquiler_indice is 'INE, IPVA (tablas 59056, 59058 y 59060). Índice, no euros: mide la evolución.';

-- Viviendas turísticas (VTE), semestral.
create table public.vivienda_turistica (
    territorio text not null references public.territorio (codigo) on delete cascade,
    periodo date not null,
    viviendas integer check (viviendas >= 0),
    plazas integer check (plazas >= 0),
    porcentaje numeric(6, 2) check (porcentaje between 0 and 100),
    primary key (territorio, periodo)
);
comment on table public.vivienda_turistica is 'INE, medición experimental de viviendas turísticas (tablas 39363 y 39366).';

-- Cada carga del INE: qué tabla, cuándo y cuántas filas.
create table public.carga (
    id bigint generated always as identity primary key,
    tabla_ine text not null,
    cargada_en timestamptz not null default now(),
    filas integer not null check (filas >= 0)
);

-- Municipios que sigue cada usuario.
create table public.seguimiento (
    usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
    territorio text not null references public.territorio (codigo) on delete cascade,
    creado_en timestamptz not null default now(),
    primary key (usuario, territorio)
);

-- Comparaciones guardadas (de dos a cuatro territorios).
create table public.comparacion (
    id uuid primary key default gen_random_uuid(),
    usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
    nombre text not null check (length(trim(nombre)) between 1 and 80),
    territorios text[] not null check (cardinality(territorios) between 2 and 4),
    creada_en timestamptz not null default now()
);
create index comparacion_usuario on public.comparacion (usuario);

-- RLS en todas las tablas. Los datos del INE se leen sin sesión y solo los escribe la carga, con la clave de servicio
-- (que no pasa por RLS). Los del usuario solo los ve y los cambia su dueño.
alter table public.territorio enable row level security;
alter table public.alquiler_indice enable row level security;
alter table public.vivienda_turistica enable row level security;
alter table public.carga enable row level security;
alter table public.seguimiento enable row level security;
alter table public.comparacion enable row level security;

create policy "lectura pública" on public.territorio for select to anon, authenticated using (true);
create policy "lectura pública" on public.alquiler_indice for select to anon, authenticated using (true);
create policy "lectura pública" on public.vivienda_turistica for select to anon, authenticated using (true);
create policy "lectura pública" on public.carga for select to anon, authenticated using (true);

create policy "solo lo suyo" on public.seguimiento for all to authenticated
    using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
create policy "solo lo suyo" on public.comparacion for all to authenticated
    using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

-- Además de RLS, sin permisos de escritura sobre los datos públicos para los roles de la web.
revoke insert, update, delete, truncate on public.territorio, public.alquiler_indice, public.vivienda_turistica,
    public.carga from anon, authenticated;
revoke all on public.seguimiento, public.comparacion from anon;

-- Búsqueda de municipios sin tildes y con erratas: primero los que tienen una palabra que empieza por el texto («coruna»
-- encuentra «A Coruña»); después, los que tienen índice de alquiler (más de 10.000 habitantes, los que más se buscan);
-- y por último, por parecido.
create function public.buscar_municipios(texto text, limite integer default 10)
returns table (codigo text, nombre text, provincia text, slug text)
language sql stable
security invoker
set search_path = ''
as $$
    with consulta as (select public.sin_tildes(trim(texto)) as q)
    select m.codigo, m.nombre, p.nombre, m.slug
    from public.territorio m
    join public.territorio p on p.codigo = m.padre
    cross join consulta c
    where m.nivel = 'municipio'
      and length(c.q) >= 2
      and (' ' || public.sin_tildes(m.nombre) like '% ' || c.q || '%'
           or public.sin_tildes(m.nombre) operator(extensions.%) c.q)
    order by ' ' || public.sin_tildes(m.nombre) like '% ' || c.q || '%' desc,
             exists (select 1 from public.alquiler_indice a where a.territorio = m.codigo) desc,
             extensions.similarity(public.sin_tildes(m.nombre), c.q) desc,
             m.nombre
    limit least(greatest(limite, 1), 20)
$$;

-- El último dato de viviendas turísticas de cada territorio.
create view public.vivienda_turistica_ultima with (security_invoker = true) as
select distinct on (territorio) territorio, periodo, viviendas, plazas, porcentaje
from public.vivienda_turistica
order by territorio, periodo desc;

-- Municipios con su evolución del alquiler: subida desde 2015 y en el último año.
create view public.alquiler_municipio with (security_invoker = true) as
select
    t.codigo, t.nombre, t.slug, p.nombre as provincia, a.anio,
    a.indice - 100 as subida_desde_2015,
    a.variacion_anual
from public.territorio t
join public.territorio p on p.codigo = t.padre
join public.alquiler_indice a on a.territorio = t.codigo
where t.nivel = 'municipio'
  and a.anio = (select max(anio) from public.alquiler_indice);

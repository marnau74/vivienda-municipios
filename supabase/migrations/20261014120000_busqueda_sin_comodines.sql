-- La búsqueda comparaba con LIKE, así que un «%» o un «_» en el texto hacían de comodín («%%» devolvía cualquier
-- municipio). Ahora se busca el texto tal cual con strpos.
create or replace function public.buscar_municipios(texto text, limite integer default 10)
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
      and (strpos(' ' || public.sin_tildes(m.nombre), ' ' || c.q) > 0
           or public.sin_tildes(m.nombre) operator(extensions.%) c.q)
    order by strpos(' ' || public.sin_tildes(m.nombre), ' ' || c.q) > 0 desc,
             exists (select 1 from public.alquiler_indice a where a.territorio = m.codigo) desc,
             extensions.similarity(public.sin_tildes(m.nombre), c.q) desc,
             m.nombre
    limit least(greatest(limite, 1), 20)
$$;

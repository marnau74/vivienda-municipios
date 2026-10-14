-- La búsqueda de municipios: sin tildes, con erratas y primero lo que empieza por el texto.
begin;
select plan(6);

-- Se parte de una base vacía aunque haya datos cargados: la transacción se deshace al final y los devuelve.
truncate public.territorio cascade;

insert into public.territorio (codigo, codigo_ine, nivel, nombre, padre, slug) values
    ('es', '00', 'pais', 'España', null, 'espana'),
    ('c01', '01', 'comunidad', 'Andalucía', 'es', 'andalucia'),
    ('p04', '04', 'provincia', 'Almería', 'c01', 'provincia-almeria'),
    ('m04013', '04013', 'municipio', 'Almería', 'p04', 'almeria-04013'),
    ('m04003', '04003', 'municipio', 'Adra', 'p04', 'adra-04003'),
    ('m04035', '04035', 'municipio', 'Cuevas del Almanzora', 'p04', 'cuevas-del-almanzora-04035'),
    ('c12', '12', 'comunidad', 'Galicia', 'es', 'galicia'),
    ('p15', '15', 'provincia', 'A Coruña', 'c12', 'provincia-a-coruna'),
    ('m15030', '15030', 'municipio', 'A Coruña', 'p15', 'a-coruna-15030'),
    ('c07', '07', 'comunidad', 'Castilla y León', 'es', 'castilla-y-leon'),
    ('p09', '09', 'provincia', 'Burgos', 'c07', 'provincia-burgos'),
    ('m09112', '09112', 'municipio', 'Coruña del Conde', 'p09', 'coruna-del-conde-09112');

set local role anon;
select is((select nombre from public.buscar_municipios('almeria') limit 1), 'Almería', 'sin tildes');
select is((select provincia from public.buscar_municipios('Almería') limit 1), 'Almería', 'trae la provincia');
select is((select nombre from public.buscar_municipios('almerya') limit 1), 'Almería', 'con una errata');
select is((select nombre from public.buscar_municipios('coruna') limit 1), 'A Coruña',
          'una palabra que empieza por el texto, aunque no sea la primera, y el más parecido primero');
select is((select count(*) from public.buscar_municipios('a'))::int, 0, 'con menos de dos letras no busca');
select is((select count(*) from public.buscar_municipios('provincia'))::int, 0, 'solo devuelve municipios');
reset role;

select * from finish();
rollback;

-- Seguridad por filas y permisos: el anónimo solo lee los datos públicos y cada usuario solo ve y cambia lo suyo.
begin;
select plan(14);

-- Se parte de una base vacía aunque haya datos cargados: la transacción se deshace al final y los devuelve.
truncate public.territorio cascade;

insert into public.territorio (codigo, codigo_ine, nivel, nombre, padre, slug) values
    ('es', '00', 'pais', 'España', null, 'espana'),
    ('c14', '14', 'comunidad', 'Región de Murcia', 'es', 'region-de-murcia'),
    ('p30', '30', 'provincia', 'Murcia', 'c14', 'provincia-murcia'),
    ('m30030', '30030', 'municipio', 'Murcia', 'p30', 'murcia-30030');

insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'ana@demo.example'),
    ('00000000-0000-0000-0000-00000000000b', 'luis@demo.example');

-- Ana sigue Murcia (como servicio, sin RLS).
insert into public.seguimiento (usuario, territorio) values ('00000000-0000-0000-0000-00000000000a', 'm30030');

-- Anónimo
set local role anon;
select is((select count(*) from public.territorio)::int, 4, 'el anónimo lee los territorios');
select throws_ok($$ insert into public.territorio (codigo, codigo_ine, nivel, nombre, padre, slug)
                    values ('m1', '1', 'municipio', 'X', 'p30', 'x') $$, '42501', null,
                 'el anónimo no escribe datos públicos');
select throws_ok($$ select * from public.seguimiento $$, '42501', null, 'el anónimo no puede leer seguimientos');
reset role;

-- Luis
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is((select count(*) from public.seguimiento)::int, 0, 'Luis no ve el seguimiento de Ana');
select lives_ok($$ insert into public.seguimiento (territorio) values ('m30030') $$,
                'Luis sigue un municipio (el usuario sale de su sesión)');
select is((select usuario from public.seguimiento), '00000000-0000-0000-0000-00000000000b'::uuid,
          'el seguimiento queda a su nombre');
select throws_ok($$ insert into public.seguimiento (usuario, territorio)
                    values ('00000000-0000-0000-0000-00000000000a', 'p30') $$, '42501', null,
                 'Luis no puede crear un seguimiento a nombre de Ana');
delete from public.seguimiento where usuario = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$ update public.territorio set nombre = 'Otra' where codigo = 'm30030' $$, '42501', null,
                 'un usuario no modifica datos públicos');
select lives_ok($$ insert into public.comparacion (nombre, territorios) values ('Mi comparación', array['m30030', 'p30']) $$,
                'Luis guarda una comparación');
select throws_ok($$ insert into public.comparacion (nombre, territorios) values ('Sola', array['m30030']) $$, '23514', null,
                 'una comparación necesita al menos dos territorios');
select throws_ok($$ insert into public.comparacion (nombre, territorios) values ('  ', array['m30030', 'p30']) $$, '23514', null,
                 'una comparación necesita nombre');
reset role;

select is((select count(*) from public.seguimiento where usuario = '00000000-0000-0000-0000-00000000000a')::int, 1,
          'Luis no ha podido borrar el seguimiento de Ana');

-- Ana
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is((select count(*) from public.comparacion)::int, 0, 'Ana no ve la comparación de Luis');
select is((select count(*) from public.seguimiento)::int, 1, 'Ana solo ve su seguimiento');
reset role;

select * from finish();
rollback;

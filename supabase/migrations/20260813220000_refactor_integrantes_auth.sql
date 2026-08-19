-- Refactor: eliminar tabla usuarios, integrantes denormalizados y auth con perfiles

-- 1. Tabla perfiles vinculada a auth.users
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text,
  created_at timestamptz not null default now()
);

-- 2. Ampliar reservaciones con datos del solicitante y agrupación recurrente
alter table public.reservaciones
  add column solicitante_nombre text,
  add column solicitante_numero_cuenta text,
  add column solicitante_correo text,
  add column solicitante_tipo text,
  add column if not exists grupo_id uuid,
  add column created_at timestamptz default now();

-- 3. Renombrar cantidad_usuarios a cantidad_personas (esquema local)
alter table public.reservaciones
  rename column cantidad_usuarios to cantidad_personas;

-- 4. Tabla de integrantes (todas las personas de la reserva, incluido el reservador)
create table public.reservaciones_integrantes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reservacion_id integer not null references public.reservaciones(id) on delete cascade,
  nombre text not null default ''::text,
  numero_cuenta text not null,
  es_reservador boolean not null default false
);

-- 5. Trigger: crear perfil automáticamente al crear cuenta en auth.users
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'usuario')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- 6. Eliminar tablas obsoletas (los datos se migraron en la base local)
alter table public.reservaciones_usuarios drop constraint if exists reservaciones_usuarios_usuario_id_fkey;
drop table if exists public.reservaciones_usuarios;
drop table if exists public.usuarios;

-- 7. Políticas RLS para las tablas que la app lee con la anon key (flujo sin sesión)

-- Tablas de consulta general: acceso abierto para anon y authenticated
create policy "Acceso_anon_laboratorios" on public.laboratorios for select using (true);
create policy "Acceso_anon_horarios" on public.horarios for select using (true);
create policy "Acceso_anon_fechas" on public.fechas_q for select using (true);
create policy "Acceso_anon_reservaciones_horarios" on public.reservaciones_horarios for select using (true);
create policy "Acceso_anon_reservaciones_integrantes" on public.reservaciones_integrantes for select using (true);
create policy "Acceso_anon_incidentes" on public.incidentes for select using (true);

create policy "Acceso_auth_laboratorios" on public.laboratorios for select using (true);
create policy "Acceso_auth_horarios" on public.horarios for select using (true);
create policy "Acceso_auth_fechas" on public.fechas_q for select using (true);
create policy "Acceso_auth_reservaciones_horarios" on public.reservaciones_horarios for select using (true);
create policy "Acceso_auth_reservaciones_integrantes" on public.reservaciones_integrantes for select using (true);
create policy "Acceso_auth_incidentes" on public.incidentes for select using (true);

-- Insert/update/delete abiertos (comportamiento previo con RLS deshabilitado)
create policy "Escritura_anon_laboratorios" on public.laboratorios for all using (true) with check (true);
create policy "Escritura_anon_horarios" on public.horarios for all using (true) with check (true);
create policy "Escritura_anon_fechas" on public.fechas_q for all using (true) with check (true);
create policy "Escritura_anon_reservaciones_horarios" on public.reservaciones_horarios for all using (true) with check (true);
create policy "Escritura_anon_reservaciones_integrantes" on public.reservaciones_integrantes for all using (true) with check (true);
create policy "Escritura_anon_incidentes" on public.incidentes for all using (true) with check (true);

create policy "Escritura_auth_laboratorios" on public.laboratorios for all using (true) with check (true);
create policy "Escritura_auth_horarios" on public.horarios for all using (true) with check (true);
create policy "Escritura_auth_fechas" on public.fechas_q for all using (true) with check (true);
create policy "Escritura_auth_reservaciones_horarios" on public.reservaciones_horarios for all using (true) with check (true);
create policy "Escritura_auth_reservaciones_integrantes" on public.reservaciones_integrantes for all using (true) with check (true);
create policy "Escritura_auth_incidentes" on public.incidentes for all using (true) with check (true);

-- perfiles: el usuario autenticado solo ve su propio perfil
create policy "Perfil_propio_select" on public.perfiles for select using (auth.uid() = id);
create policy "Perfil_propio_update" on public.perfiles for update using (auth.uid() = id) with check (auth.uid() = id);

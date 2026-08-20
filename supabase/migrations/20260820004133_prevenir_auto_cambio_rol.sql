-- Función security definer: devuelve el rol actual del usuario autenticado.
-- Bypasa RLS en su consulta interna para evitar recursión en las políticas.
create or replace function public.mi_rol()
returns text
language sql
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- Un usuario solo puede actualizar su propio perfil y NO puede cambiar su propio rol.
-- El with check exige que el nuevo rol sea igual a su rol actual (mi_rol()).
drop policy if exists "Perfil_propio_update" on public.perfiles;
create policy "Perfil_propio_update"
on public.perfiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and public.mi_rol() = rol);

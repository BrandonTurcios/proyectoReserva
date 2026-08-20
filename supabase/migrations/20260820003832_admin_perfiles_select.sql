-- Función auxiliar security definer: verifica si el usuario autenticado es admin.
-- Bypasa RLS en su consulta interna para evitar recursión en las políticas.
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

-- Política SELECT: el admin puede ver todos los perfiles.
-- Sin una política SELECT sobre la fila objetivo, el UPDATE no funciona.
create policy "Admin_select_perfiles"
on public.perfiles
for select
to authenticated
using (public.es_admin());

-- Política UPDATE: el admin puede actualizar cualquier perfil (recrear con la función).
drop policy if exists "Update_rol_usuarios" on public.perfiles;
create policy "Update_rol_usuarios"
on public.perfiles
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- Permitir que los admins actualicen el rol de cualquier usuario en perfiles
create policy "Update_rol_usuarios"
on public.perfiles
as permissive
for update
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  )
)
with check (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  )
);

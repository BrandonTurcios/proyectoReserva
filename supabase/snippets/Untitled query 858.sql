UPDATE public.perfiles
SET rol = 'admin', nombre = 'Winder Matamoros'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@unitec.edu.hn');
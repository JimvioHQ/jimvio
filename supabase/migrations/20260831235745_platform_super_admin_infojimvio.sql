-- Grant platform admin role to infojimvio@gmail.com (existing auth user).
-- Password is NOT stored here; role assignment only.

INSERT INTO public.user_roles (user_id, role, is_active)
SELECT p.id, 'admin'::public.user_role, true
FROM public.profiles p
WHERE lower(trim(p.email)) = lower(trim('infojimvio@gmail.com'))
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

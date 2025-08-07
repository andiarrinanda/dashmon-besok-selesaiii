-- Hapus admin user lama dan buat yang baru dengan password hash yang benar
DELETE FROM auth.users WHERE email = 'admin@dashmon.com';
DELETE FROM public.profiles WHERE id = '7b41584d-e9ab-47cf-9bf4-052bc4d32d18';

-- Buat admin user baru dengan password hash yang fresh
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@dashmon.com',
  crypt('admin123', gen_salt('bf')), -- Generate fresh hash for 'admin123'
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "admin@dashmon.com", "full_name": "Admin DASHMON", "role": "admin", "username": "admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Buat profile admin
INSERT INTO public.profiles (id, username, full_name, role, sbu_name)
SELECT id, 'admin', 'Admin DASHMON', 'admin', NULL
FROM auth.users 
WHERE email = 'admin@dashmon.com';
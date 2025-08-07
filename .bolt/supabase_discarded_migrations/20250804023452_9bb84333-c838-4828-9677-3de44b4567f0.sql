-- Create an admin user for testing
-- Note: This is a development admin account

-- First, check if we have the admin user in profiles
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
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
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@dashmon.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
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
) ON CONFLICT (email) DO NOTHING;

-- Create the corresponding profile
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  role,
  sbu_name
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Admin DASHMON',
  'admin',
  null
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
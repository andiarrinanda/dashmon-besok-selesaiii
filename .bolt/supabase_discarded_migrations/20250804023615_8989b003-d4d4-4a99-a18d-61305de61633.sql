-- Create auth user yang sesuai dengan profile admin yang sudah ada
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
  '7b41584d-e9ab-47cf-9bf4-052bc4d32d18',
  '00000000-0000-0000-0000-000000000000',
  'admin@dashmon.com',
  '$2a$10$KzKjMZQP8yH6V8K7hHGdC.T5Z3aWqGgqmzqT2F2N4K9LmzQKvL7K2',
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "admin@dashmon.com", "full_name": "Andiar Rinanda Agastya", "role": "admin", "username": "andiarganteng"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;
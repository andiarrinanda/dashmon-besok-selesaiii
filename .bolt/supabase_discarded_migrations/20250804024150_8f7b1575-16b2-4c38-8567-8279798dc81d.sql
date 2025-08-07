-- Hapus admin user lama dan buat yang baru dengan password yang benar
DELETE FROM auth.users WHERE email = 'admin@dashmon.com';

-- Buat admin user baru dengan password hash yang benar untuk 'admin123'
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
  '$2a$10$4K4dnl8qr3Z4E7XGmA3UveyQAK5KICB0b/RNvGtYaGGG3w6t7t99m', -- Hash untuk 'admin123'
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

-- Update profile admin yang sudah ada
UPDATE public.profiles 
SET username = 'admin', full_name = 'Admin DASHMON'
WHERE id = '7b41584d-e9ab-47cf-9bf4-052bc4d32d18';
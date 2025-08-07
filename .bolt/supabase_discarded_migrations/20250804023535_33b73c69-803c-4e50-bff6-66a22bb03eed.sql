-- Create admin profile directly in the profiles table
-- This will create a profile without creating an auth user first
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  role,
  sbu_name
) VALUES (
  gen_random_uuid(),
  'admin',
  'Admin DASHMON',
  'admin',
  null
) ON CONFLICT (username) DO NOTHING;
-- Update password untuk admin yang sudah ada
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf')),
    email_confirmed_at = NOW(),
    last_sign_in_at = NOW()
WHERE email = 'admin@dashmon.com';
-- Hapus semua data admin yang ada
DELETE FROM public.profiles WHERE username = 'admin' OR full_name LIKE '%Admin%';
DELETE FROM auth.users WHERE email = 'admin@dashmon.com';

-- Buat admin user baru dengan UUID yang baru
DO $$
DECLARE
    new_admin_id uuid := gen_random_uuid();
BEGIN
    -- Insert ke auth.users
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
        new_admin_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@dashmon.com',
        crypt('admin123', gen_salt('bf')),
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

    -- Insert ke profiles
    INSERT INTO public.profiles (id, username, full_name, role, sbu_name)
    VALUES (new_admin_id, 'admin', 'Admin DASHMON', 'admin', NULL);
END $$;
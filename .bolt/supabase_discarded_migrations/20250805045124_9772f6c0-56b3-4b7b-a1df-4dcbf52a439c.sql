-- Add DELETE policy for profiles table to allow admins to delete users
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM profiles admin_profile 
  WHERE admin_profile.id = auth.uid() 
  AND admin_profile.role = 'admin'
));
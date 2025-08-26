-- Add missing DELETE policy for profiles table to complete RLS protection

CREATE POLICY "Users can delete their own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);

-- Add security comment
COMMENT ON POLICY "Users can delete their own profile" ON profiles IS 'Allows users to delete their own profile data - completing RLS protection';
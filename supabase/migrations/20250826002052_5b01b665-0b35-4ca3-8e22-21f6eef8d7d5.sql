-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  salon_name TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add user_id column to existing tables
ALTER TABLE public.salon_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.barbers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.custom_blocks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lunch_breaks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.todo_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for salon_settings
DROP POLICY IF EXISTS "Public access to salon settings" ON public.salon_settings;
CREATE POLICY "Users can view their own salon settings" 
ON public.salon_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own salon settings" 
ON public.salon_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own salon settings" 
ON public.salon_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for barbers
DROP POLICY IF EXISTS "Public access to barbers" ON public.barbers;
CREATE POLICY "Users can manage their own barbers" 
ON public.barbers 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policies for appointments
DROP POLICY IF EXISTS "Public access to appointments" ON public.appointments;
CREATE POLICY "Users can manage their own appointments" 
ON public.appointments 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Public access to transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policies for custom_blocks
DROP POLICY IF EXISTS "Public access to custom blocks" ON public.custom_blocks;
CREATE POLICY "Users can manage their own custom blocks" 
ON public.custom_blocks 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policies for lunch_breaks
DROP POLICY IF EXISTS "Public access to lunch breaks" ON public.lunch_breaks;
CREATE POLICY "Users can manage their own lunch breaks" 
ON public.lunch_breaks 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policies for todo_items
DROP POLICY IF EXISTS "Public access to todo items" ON public.todo_items;
CREATE POLICY "Users can manage their own todo items" 
ON public.todo_items 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, salon_name)
  VALUES (NEW.id, 'Mon Salon');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updating updated_at column on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
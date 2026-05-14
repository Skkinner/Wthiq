-- Add password columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS password_history TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment explaining password storage
COMMENT ON COLUMN public.users.password IS 'User password - should be hashed in production';
COMMENT ON COLUMN public.users.password_history IS 'Array of previous passwords for password history validation';

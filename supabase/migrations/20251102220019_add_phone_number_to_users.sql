/*
  # Add phone number field to users table

  1. Changes
    - Add `phone_number` column to users table (nullable initially for existing users)
    - Add `phone_verified` column to track verification status
    - Add index on phone_number for faster lookups

  2. Security
    - Phone numbers are sensitive data - ensure RLS policies protect them
*/

-- Add phone_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number text;
  END IF;
END $$;

-- Add phone_verified column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

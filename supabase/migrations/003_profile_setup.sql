-- Add setup_complete flag to profiles
-- When false, the user must complete their profile (choose username) before using the app.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT false;

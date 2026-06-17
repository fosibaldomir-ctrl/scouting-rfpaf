-- Add video URL column to ejercicios table
-- This migration adds support for storing YouTube/Vimeo URLs for exercises

ALTER TABLE ejercicios
ADD COLUMN IF NOT EXISTS video TEXT DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN ejercicios.video IS 'YouTube or Vimeo URL for exercise demonstration video';

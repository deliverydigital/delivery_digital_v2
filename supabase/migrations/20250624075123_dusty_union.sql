/*
  # Add Categories Table

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `categories` table
    - Add policy for authenticated users to read categories
    - Add policy for admins to manage categories
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view categories"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create index
CREATE INDEX idx_categories_name ON categories(name);

-- Insert some default categories
INSERT INTO categories (name) VALUES
  ('Web Development'),
  ('Mobile Development'),
  ('E-commerce'),
  ('Enterprise Solutions'),
  ('Cloud Services'),
  ('UI/UX Design'),
  ('Digital Marketing'),
  ('Security')
ON CONFLICT (name) DO NOTHING;
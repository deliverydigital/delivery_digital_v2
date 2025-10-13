/*
  # Create Project Types and Default Tasks Tables

  1. New Tables
    - `project_types`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Name of the project type
      - `description` (text) - Description of the project type
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `default_tasks`
      - `id` (uuid, primary key)
      - `project_type_id` (uuid, foreign key) - References project_types
      - `title` (text) - Task title
      - `description` (text) - Task description
      - `priority` (text) - Priority level (low, medium, high, urgent)
      - `estimated_hours` (integer) - Estimated hours for the task
      - `order_index` (integer) - Order of the task in the list
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read and manage
*/

-- Create project_types table
CREATE TABLE IF NOT EXISTS project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create default_tasks table
CREATE TABLE IF NOT EXISTS default_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id uuid NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_hours integer DEFAULT 0,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_default_tasks_project_type_id ON default_tasks(project_type_id);
CREATE INDEX IF NOT EXISTS idx_default_tasks_order ON default_tasks(project_type_id, order_index);

-- Enable Row Level Security
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for project_types (allow all authenticated users for now)
CREATE POLICY "Authenticated users can view project types"
  ON project_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project types"
  ON project_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project types"
  ON project_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project types"
  ON project_types FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for default_tasks (allow all authenticated users for now)
CREATE POLICY "Authenticated users can view default tasks"
  ON default_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert default tasks"
  ON default_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update default tasks"
  ON default_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete default tasks"
  ON default_tasks FOR DELETE
  TO authenticated
  USING (true);

-- Insert default project types
INSERT INTO project_types (name, description) VALUES
  ('Site Web / Application Web', 'Développement de sites web et applications web'),
  ('Application Mobile', 'Développement d''applications mobiles iOS et Android'),
  ('E-commerce', 'Boutiques en ligne et plateformes de vente'),
  ('Application Desktop', 'Applications de bureau multi-plateformes'),
  ('API / Backend', 'Services backend et APIs REST/GraphQL'),
  ('Formation', 'Programmes de formation et cours'),
  ('Consulting', 'Services de conseil et expertise technique')
ON CONFLICT (name) DO NOTHING;

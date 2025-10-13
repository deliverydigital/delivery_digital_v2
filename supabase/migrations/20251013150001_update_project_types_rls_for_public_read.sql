/*
  # Update RLS Policies for Public Read Access

  1. Changes
    - Drop existing restrictive SELECT policies
    - Add new policies allowing public read access for project types and default tasks
    - Keep write operations restricted to authenticated users only

  2. Security
    - Anyone can read project types and default tasks (public catalog data)
    - Only authenticated users can create, update, or delete
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view project types" ON project_types;
DROP POLICY IF EXISTS "Authenticated users can view default tasks" ON default_tasks;

-- Create new public read policies
CREATE POLICY "Anyone can view project types"
  ON project_types FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view default tasks"
  ON default_tasks FOR SELECT
  USING (true);

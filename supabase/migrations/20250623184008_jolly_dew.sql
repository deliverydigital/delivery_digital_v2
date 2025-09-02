/*
  # Authentication Helper Functions

  1. Functions
    - Create helper functions for authentication and authorization
    - Add admin role check function
*/

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is trainer
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'trainer'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is developer
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'developer'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is staff (admin, trainer, or developer)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'trainer', 'developer')
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin policies for all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND 
    tablename NOT LIKE 'pg_%' AND 
    tablename NOT LIKE 'schema_%'
  LOOP
    EXECUTE format('
      CREATE POLICY "Admins have full access to %1$s" 
      ON %1$s 
      USING (is_admin())
      WITH CHECK (is_admin());
    ', table_name);
  END LOOP;
END
$$;
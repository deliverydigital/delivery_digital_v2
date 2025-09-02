/*
  # Enable Row Level Security

  1. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_attachments table
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on message_attachments table
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_comments table
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_attachments table
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_checklist table
ALTER TABLE task_checklist ENABLE ROW LEVEL SECURITY;

-- Enable RLS on time_entries table
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Enable RLS on training_sessions table
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on training_participants table
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on training_attendance table
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Enable RLS on training_evaluations table
ALTER TABLE training_evaluations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_log table
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on file_uploads table
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Enable RLS on invoice_items table
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on system_settings table
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" 
  ON users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create policies for clients table
CREATE POLICY "Clients can view their own data" 
  ON clients 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Clients can update their own data" 
  ON clients 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create policies for projects table
CREATE POLICY "Clients can view their own projects" 
  ON projects 
  FOR SELECT 
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can create their own projects" 
  ON projects 
  FOR INSERT 
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own projects" 
  ON projects 
  FOR UPDATE 
  USING (auth.uid() = client_id);

-- Create policies for messages table
CREATE POLICY "Users can view messages they sent or received" 
  ON messages 
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR 
    auth.uid() IN (
      SELECT client_id FROM projects WHERE id = project_id
    )
  );

CREATE POLICY "Users can send messages" 
  ON messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Create policies for tasks table
CREATE POLICY "Users can view tasks for their projects" 
  ON tasks 
  FOR SELECT 
  USING (
    auth.uid() = assigned_to OR 
    auth.uid() IN (
      SELECT client_id FROM projects WHERE id = project_id
    )
  );

-- Create policies for notifications table
CREATE POLICY "Users can view their own notifications" 
  ON notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policies for training_participants table
CREATE POLICY "Users can view their own training registrations" 
  ON training_participants 
  FOR SELECT 
  USING (auth.uid() = participant_id);

-- Create policies for system_settings table
CREATE POLICY "Everyone can view public settings" 
  ON system_settings 
  FOR SELECT 
  USING (is_public = true);

-- Admin policies (using is_admin() function that needs to be created)
-- Note: You'll need to create this function or modify these policies based on your auth setup
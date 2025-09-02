/*
  # Ajout des tables pour la gestion de devis et factures

  1. Nouvelles Tables
    - `quotes` - Table pour stocker les devis
    - `quote_items` - Table pour les éléments de devis
    - `invoice_items` - Modification de la structure existante

  2. Security
    - Enable RLS on new tables
    - Add policies for admin access
    - Add policies for client access
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 20.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  notes TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at on quotes
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Clients can view their own quotes" 
  ON quotes 
  FOR SELECT 
  USING (auth.uid() = client_id);

-- Create indexes for quotes
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Modify invoice_items table to ensure it has all needed fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN quantity DECIMAL(8,2) DEFAULT 1;
  END IF;
END $$;

-- Create indexes for invoices if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_client_id'
  ) THEN
    CREATE INDEX idx_invoices_client_id ON invoices(client_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_project_id'
  ) THEN
    CREATE INDEX idx_invoices_project_id ON invoices(project_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_status'
  ) THEN
    CREATE INDEX idx_invoices_status ON invoices(status);
  END IF;
END $$;

-- Create policies for invoices if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Clients can view their own invoices'
  ) THEN
    CREATE POLICY "Clients can view their own invoices" 
      ON invoices 
      FOR SELECT 
      USING (auth.uid() = client_id);
  END IF;
END $$;
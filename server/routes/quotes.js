import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Get all quotes (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        users:client_id (name, email, company),
        projects:project_id (title)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quotes'
    });
  }
});

// Get quotes for a client
router.get('/client/:clientId', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check if user is admin or the client
    if (req.user.role !== 'admin' && req.user.id !== clientId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        projects:project_id (title)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching client quotes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client quotes'
    });
  }
});

// Get a single quote by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        users:client_id (name, email, company),
        projects:project_id (title)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Check if user is admin or the client
    if (req.user.role !== 'admin' && req.user.id !== data.client_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quote'
    });
  }
});

// Create a new quote (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      clientId,
      projectId,
      title,
      description,
      validUntil,
      items,
      taxRate = 20.00,
      currency = 'EUR',
      notes
    } = req.body;

    if (!clientId || !title || !validUntil || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const { data, error } = await supabase
      .from('quotes')
      .insert([
        {
          client_id: clientId,
          project_id: projectId || null,
          title,
          description,
          status: 'draft',
          valid_until: validUntil,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency,
          notes,
          items
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quote'
    });
  }
});

// Update a quote (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      validUntil,
      items,
      taxRate,
      currency,
      notes,
      projectId
    } = req.body;

    // Calculate totals if items are provided
    let updates = {
      title,
      description,
      valid_until: validUntil,
      currency,
      notes,
      project_id: projectId || null,
      updated_at: new Date()
    };

    if (items && Array.isArray(items)) {
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
      const tax_rate = taxRate || 20.00;
      const taxAmount = subtotal * (tax_rate / 100);
      const totalAmount = subtotal + taxAmount;

      updates = {
        ...updates,
        items,
        subtotal,
        tax_rate,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quote'
    });
  }
});

// Update quote status (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ status, updated_at: new Date() })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quote status'
    });
  }
});

// Convert quote to invoice (admin only)
router.post('/:id/convert-to-invoice', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (quoteError) throw quoteError;
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    // Generate invoice number (format: INV-YYYYMMDD-XXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of invoices to generate sequential number
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          invoice_number: invoiceNumber,
          client_id: quote.client_id,
          project_id: quote.project_id,
          status: 'draft',
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(date.setDate(date.getDate() + 30)).toISOString().slice(0, 10),
          subtotal: quote.subtotal,
          tax_rate: quote.tax_rate,
          tax_amount: quote.tax_amount,
          total_amount: quote.total_amount,
          currency: quote.currency,
          notes: quote.notes
        }
      ])
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    
    // Create invoice items
    const invoiceItems = quote.items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);
    
    if (itemsError) throw itemsError;
    
    // Update quote status to accepted
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'accepted', updated_at: new Date() })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    res.json({
      success: true,
      data: {
        invoice,
        message: 'Quote successfully converted to invoice'
      }
    });
    
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert quote to invoice'
    });
  }
});

// Delete a quote (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quote'
    });
  }
});

export default router;
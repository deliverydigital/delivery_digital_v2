import express from 'express';
import { User, Project, Quote } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all quotes (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quotes = await Quote.find()
      .populate('client_id', 'name email company')
      .populate('project_id', 'title')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: quotes.map(quote => ({
        id: quote._id,
        client_id: quote.client_id._id,
        project_id: quote.project_id?._id,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        items: quote.items,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        users: {
          name: quote.client_id.name,
          email: quote.client_id.email,
          company: quote.client_id.company
        },
        projects: quote.project_id ? { title: quote.project_id.title } : null
      }))
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quotes = await Quote.find({ client_id: clientId })
      .populate('project_id', 'title')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: quotes.map(quote => ({
        id: quote._id,
        client_id: quote.client_id,
        project_id: quote.project_id?._id,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        items: quote.items,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        projects: quote.project_id ? { title: quote.project_id.title } : null
      }))
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quote = await Quote.findById(id)
      .populate('client_id', 'name email company')
      .populate('project_id', 'title');

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    // Check if user is admin or the client
    if (req.user.role !== 'admin' && req.user.id !== quote.client_id._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        id: quote._id,
        client_id: quote.client_id._id,
        project_id: quote.project_id?._id,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        items: quote.items,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        users: {
          name: quote.client_id.name,
          email: quote.client_id.email,
          company: quote.client_id.company
        },
        projects: quote.project_id ? { title: quote.project_id.title } : null
      }
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    // Validate client exists
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Validate project if provided
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const quoteData = {
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
    };

    const quote = new Quote(quoteData);
    await quote.save();

    // Populate the created quote
    await quote.populate('client_id', 'name email company');
    if (quote.project_id) {
      await quote.populate('project_id', 'title');
    }

    res.status(201).json({
      success: true,
      data: {
        id: quote._id,
        client_id: quote.client_id._id,
        project_id: quote.project_id?._id,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        items: quote.items,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        users: {
          name: quote.client_id.name,
          email: quote.client_id.email,
          company: quote.client_id.company
        },
        projects: quote.project_id ? { title: quote.project_id.title } : null
      }
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    // Update fields
    if (title !== undefined) quote.title = title;
    if (description !== undefined) quote.description = description;
    if (validUntil !== undefined) quote.valid_until = validUntil;
    if (currency !== undefined) quote.currency = currency;
    if (notes !== undefined) quote.notes = notes;
    if (projectId !== undefined) quote.project_id = projectId;

    // Recalculate totals if items are provided
    if (items && Array.isArray(items)) {
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
      const tax_rate = taxRate !== undefined ? taxRate : quote.tax_rate;
      const taxAmount = subtotal * (tax_rate / 100);
      const totalAmount = subtotal + taxAmount;

      quote.items = items;
      quote.subtotal = subtotal;
      quote.tax_rate = tax_rate;
      quote.tax_amount = taxAmount;
      quote.total_amount = totalAmount;
    }

    await quote.save();

    // Populate the updated quote
    await quote.populate('client_id', 'name email company');
    if (quote.project_id) {
      await quote.populate('project_id', 'title');
    }

    res.json({
      success: true,
      data: {
        id: quote._id,
        client_id: quote.client_id._id,
        project_id: quote.project_id?._id,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes,
        items: quote.items,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        users: {
          name: quote.client_id.name,
          email: quote.client_id.email,
          company: quote.client_id.company
        },
        projects: quote.project_id ? { title: quote.project_id.title } : null
      }
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    quote.status = status;
    await quote.save();

    res.json({
      success: true,
      data: {
        id: quote._id,
        status: quote.status,
        updated_at: quote.updated_at
      }
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
    
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }
    
    const quote = await Quote.findById(id);
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    // Generate invoice number (format: INV-YYYYMMDD-XXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get existing invoices count to generate sequential number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${dateStr}-${(invoiceCount + 1).toString().padStart(3, '0')}`;
    
    // Create invoice data
    const invoiceData = {
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
      notes: quote.notes,
      items: quote.items
    };
    
    // Create and save invoice
    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    // Update quote status to accepted
    quote.status = 'accepted';
    await quote.save();
    
    res.json({
      success: true,
      data: {
        invoice: {
          id: invoice._id,
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
          project_id: invoice.project_id,
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax_rate: invoice.tax_rate,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          currency: invoice.currency,
          notes: invoice.notes,
          items: invoice.items,
          created_at: invoice.created_at,
          updated_at: invoice.updated_at
        },
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

    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable'
      });
    }

    const quote = await Quote.findByIdAndDelete(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

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
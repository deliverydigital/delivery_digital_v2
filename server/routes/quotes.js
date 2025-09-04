import express from 'express';
import { User, Project } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Quote storage (using localStorage for demo)
const getQuotes = () => {
  try {
    const quotes = localStorage.getItem('quotes');
    return quotes ? JSON.parse(quotes) : [];
  } catch (error) {
    console.error('Error reading quotes:', error);
    return [];
  }
};

const saveQuotes = (quotes) => {
  try {
    localStorage.setItem('quotes', JSON.stringify(quotes));
  } catch (error) {
    console.error('Error saving quotes:', error);
  }
};

// Get all quotes (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const quotes = getQuotes();

    // Populate client and project information
    const quotesWithDetails = await Promise.all(
      quotes.map(async (quote) => {
        let clientInfo = null;
        let projectInfo = null;

        if (isMongoAvailable()) {
          if (quote.client_id) {
            const client = await User.findById(quote.client_id).select('name email company');
            if (client) {
              clientInfo = {
                name: client.name,
                email: client.email,
                company: client.company
              };
            }
          }

          if (quote.project_id) {
            const project = await Project.findById(quote.project_id).select('title');
            if (project) {
              projectInfo = { title: project.title };
            }
          }
        }

        return {
          ...quote,
          users: clientInfo,
          projects: projectInfo
        };
      })
    );

    res.json({
      success: true,
      data: quotesWithDetails
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

    const quotes = getQuotes();
    const clientQuotes = quotes.filter(q => q.client_id === clientId);

    // Populate project information
    const quotesWithProjects = await Promise.all(
      clientQuotes.map(async (quote) => {
        let projectInfo = null;

        if (isMongoAvailable() && quote.project_id) {
          const project = await Project.findById(quote.project_id).select('title');
          if (project) {
            projectInfo = { title: project.title };
          }
        }

        return {
          ...quote,
          projects: projectInfo
        };
      })
    );

    res.json({
      success: true,
      data: quotesWithProjects
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

    const quotes = getQuotes();
    const quote = quotes.find(q => q.id === id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    // Check if user is admin or the client
    if (req.user.role !== 'admin' && req.user.id !== quote.client_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Populate client and project information
    let clientInfo = null;
    let projectInfo = null;

    if (isMongoAvailable()) {
      if (quote.client_id) {
        const client = await User.findById(quote.client_id).select('name email company');
        if (client) {
          clientInfo = {
            name: client.name,
            email: client.email,
            company: client.company
          };
        }
      }

      if (quote.project_id) {
        const project = await Project.findById(quote.project_id).select('title');
        if (project) {
          projectInfo = { title: project.title };
        }
      }
    }

    const quoteWithDetails = {
      ...quote,
      users: clientInfo,
      projects: projectInfo
    };

    res.json({
      success: true,
      data: quoteWithDetails
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

    // Check if MongoDB is available and validate client/project
    if (isMongoAvailable()) {
      const client = await User.findById(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          });
        }
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const newQuote = {
      id: `quote-${Date.now()}`,
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
      items,
      created_at: new Date(),
      updated_at: new Date()
    };

    const quotes = getQuotes();
    quotes.push(newQuote);
    saveQuotes(quotes);

    res.status(201).json({
      success: true,
      data: newQuote
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

    const quotes = getQuotes();
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    const quote = quotes[quoteIndex];

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
      const tax_rate = taxRate || quote.tax_rate || 20.00;
      const taxAmount = subtotal * (tax_rate / 100);
      const totalAmount = subtotal + taxAmount;

      quote.items = items;
      quote.subtotal = subtotal;
      quote.tax_rate = tax_rate;
      quote.tax_amount = taxAmount;
      quote.total_amount = totalAmount;
    }

    quote.updated_at = new Date();
    quotes[quoteIndex] = quote;
    saveQuotes(quotes);

    res.json({
      success: true,
      data: quote
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

    const quotes = getQuotes();
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    quotes[quoteIndex].status = status;
    quotes[quoteIndex].updated_at = new Date();
    saveQuotes(quotes);

    res.json({
      success: true,
      data: quotes[quoteIndex]
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
    
    const quotes = getQuotes();
    const quote = quotes.find(q => q.id === id);
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    // Generate invoice number (format: INV-YYYYMMDD-XXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get existing invoices to generate sequential number
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const invoiceNumber = `INV-${dateStr}-${(invoices.length + 1).toString().padStart(3, '0')}`;
    
    // Create invoice
    const invoice = {
      id: `invoice-${Date.now()}`,
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
      items: quote.items,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Save invoice
    invoices.push(invoice);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    
    // Update quote status to accepted
    const quoteIndex = quotes.findIndex(q => q.id === id);
    quotes[quoteIndex].status = 'accepted';
    quotes[quoteIndex].updated_at = new Date();
    saveQuotes(quotes);
    
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

    const quotes = getQuotes();
    const filteredQuotes = quotes.filter(q => q.id !== id);

    if (quotes.length === filteredQuotes.length) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }

    saveQuotes(filteredQuotes);

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
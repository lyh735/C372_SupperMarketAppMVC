const Invoice = require('../models/Invoice');

const InvoiceController = {
  /**
   * Admin: List all user invoices
   */
  listAllInvoices(req, res) {
    const user = req.session ? req.session.user : null;
    
    // Only admins can view all invoices
    if (!user || !user.role || String(user.role).toLowerCase() !== 'admin') {
      req.flash('error', 'Only admins can view all purchase history');
      return res.redirect('/');
    }

    Invoice.allInvoices((err, invoices) => {
      if (err) {
        console.error('Error loading all invoices:', err);
        return res.status(500).send('Error loading invoices');
      }

      res.render('allInvoicesAdmin', {
        invoices: invoices || [],
        user
      });
    });
  },

  listUserInvoices(req, res) {
    const userId = req.session.user.id || req.session.user.userId;

    Invoice.invoiceOverview(userId, (err, invoices) => {
      if (err) {
        console.error('Error loading invoices:', err);
        return res.status(500).send('Error loading invoices');
      }

      res.render('invoicesOverview', {
        invoices: invoices || [],
        user: req.session.user
      });
    });
  },

  showInvoice(req, res) {
    const invoiceId = parseInt(req.params.id, 10);
    const user = req.session ? req.session.user : null;
    const userId = user ? (user.id || user.userId) : null;
    const isAdmin = user && user.role && String(user.role).toLowerCase() === 'admin';

    Invoice.invoiceDetails(invoiceId, (err, items) => {
      if (err) {
        console.error('Error loading invoice items:', err);
        return res.status(500).send('Error loading invoice items');
      }

      Invoice.getInvoiceById(invoiceId, (err2, invoice) => {
        if (err2) {
          console.error('Error loading invoice:', err2);
          return res.status(500).send('Error loading invoice');
        }

        if (!invoice) {
          return res.status(404).send('Invoice not found');
        }

        // Check authorization: admins can view any invoice, users can only view their own
        if (!isAdmin && invoice.userId !== userId) {
          req.flash('error', 'You do not have permission to view this invoice');
          return res.redirect('/invoices');
        }

        res.render('invoiceDetails', {
          invoice,
          items: items || [],
          user
        });
      });
    });
  }
};

module.exports = InvoiceController;

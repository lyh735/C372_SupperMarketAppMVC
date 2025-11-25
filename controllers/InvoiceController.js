const Invoice = require('../models/Invoice');

const InvoiceController = {
  listUserInvoices(req, res) {
    const userId = req.session.user.userId;

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
    const userId = req.session.user.userId;

    Invoice.invoiceDetails(invoiceId, (err, items) => {
      if (err) {
        console.error('Error loading invoice items:', err);
        return res.status(500).send('Error loading invoice items');
      }

      Invoice.invoiceOverview(userId, (err2, invoices) => {
        if (err2) {
          console.error('Error loading invoice header:', err2);
          return res.status(500).send('Error loading invoice');
        }

        const invoice = (invoices || []).find(inv => inv.invoiceId == invoiceId);

        if (!invoice) {
          return res.status(404).send('Invoice not found');
        }

        res.render('invoiceDetails', {
          invoice,
          items: items || [],
          user: req.session.user
        });
      });
    });
  }
};

module.exports = InvoiceController;

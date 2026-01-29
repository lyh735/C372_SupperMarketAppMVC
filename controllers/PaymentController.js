// controllers/PaymentController.js
const Payment = require('../models/Payment');

const PaymentController = {
  /**
   * Get latest payment by invoiceId.
   * GET /payments/invoice/:invoiceId
   */
  getPaymentByInvoice(req, res) {
    const invoiceId = parseInt(req.params.invoiceId, 10);
    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required' });
    }

    Payment.getByInvoiceId(invoiceId, (err, payment) => {
      if (err) {
        console.error('Error loading payment:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      return res.json({ success: true, payment });
    });
  }
};

module.exports = PaymentController;

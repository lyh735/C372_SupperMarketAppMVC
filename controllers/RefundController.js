// controllers/RefundController.js
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const refundService = require('../services/refundService');
const db = require('../db');

/**
 * Process a refund for a completed invoice.
 * 
 * POST /refund/:invoiceId
 * Body: { reason: "string" }
 * 
 * Returns:
 * - Success: { success: true, message: "...", invoiceId, refundStatus, refundDate, refundReason }
 * - Error: { success: false, error: "..." }
 */
async function refundInvoice(req, res) {
  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;
    const redirectBase = invoiceId ? `/invoice/${invoiceId}` : '/invoices';
    const redirectFail = (message) => {
      const msg = message || 'Refund request failed. Please try again.';
      return res.redirect(`${redirectBase}?refund=fail&refundMsg=${encodeURIComponent(msg)}`);
    };

    // Validation: invoiceId and reason required
    if (!invoiceId) {
      return redirectFail('invoiceId is required');
    }
    if (!reason || reason.trim() === '') {
      return redirectFail('Refund reason is required');
    }

    // Fetch the invoice
    Invoice.getInvoiceById(invoiceId, async (err, invoice) => {
      if (err) {
        console.error('Error fetching invoice:', err);
        return redirectFail('Database error');
      }

      // Validate: invoice exists
      if (!invoice) {
        return redirectFail('Invoice not found');
      }

      // Validate: paymentStatus is "completed"
      if (invoice.paymentStatus !== 'completed') {
        return redirectFail(`Cannot refund invoice with payment status: ${invoice.paymentStatus}`);
      }

      // Fetch payment row to track refunds in payments table
      Payment.getByInvoiceId(invoiceId, async (payErr, payment) => {
        if (payErr) {
          console.error('Error fetching payment:', payErr);
          return redirectFail('Failed to load payment info');
        }

        // Validate: refundStatus is not "refunded" (prefer payments table)
        const existingRefundStatus = payment?.refundStatus || invoice.refundStatus;
        if (existingRefundStatus === 'refunded') {
          return redirectFail('Invoice has already been refunded');
        }

        const provider = (payment?.provider || invoice.paymentMethod || '').toLowerCase();
        const paymentRef = payment?.paymentRef || invoice.paymentRef;

        try {
          let refundResult = null;

          // If PayPal, call refund service
          if (provider === 'paypal') {
            refundResult = await refundService.refundPayPal(
              paymentRef,
              invoice.totalAmount
            );

            if (!refundResult || !refundResult.success) {
              return redirectFail(refundResult?.message || 'PayPal refund failed');
            }
          }
          // If NETS or others, refund is simulated (DB update only)

          const refundDate = new Date();
          const refundRef = refundResult?.refundId || null;
          const rawResponse = refundResult?.rawResponse
            ? JSON.stringify(refundResult.rawResponse)
            : null;

          const updateInvoiceRefund = () => {
            const updateSql = `
              UPDATE invoices
              SET refundStatus = ?, refundDate = ?, refundReason = ?
              WHERE invoiceId = ?
            `;

            db.query(updateSql, ['refunded', refundDate, reason, invoiceId], (updateErr) => {
              if (updateErr) {
                console.error('Error updating invoice refund status:', updateErr);
                return redirectFail('Failed to update refund status');
              }

                return res.render('refundSuccess', {
                  success: true,
                  message: 'Refund processed successfully',
                  invoiceId,
                  refundStatus: 'refunded',
                  refundDate,
                  refundReason: reason,
                  refundRef,
                  refundedAmount: invoice.totalAmount
                });
            });
          };

          if (payment) {
            Payment.updateRefund(
              payment.paymentId,
              'refunded',
              invoice.totalAmount,
              refundRef,
              refundDate,
              rawResponse,
              (payUpdateErr) => {
                if (payUpdateErr) {
                  console.error('Error updating payment refund status:', payUpdateErr);
                  return redirectFail('Failed to update payment refund status');
                }
                return updateInvoiceRefund();
              }
            );
          } else {
            return updateInvoiceRefund();
          }
        } catch (error) {
          console.error('Error processing refund:', error);
          return redirectFail(error.message || 'An error occurred while processing the refund');
        }
      });
    });

  } catch (error) {
    console.error('Unexpected error in refundInvoice:', error);
    return res.redirect('/invoices?refund=fail&refundMsg=An%20unexpected%20error%20occurred');
  }
}

module.exports = {
  refundInvoice
};

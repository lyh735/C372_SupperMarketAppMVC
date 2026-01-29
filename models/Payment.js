// models/Payment.js
const db = require('../db');

const Payment = {
  /**
   * Get the latest payment row for a given invoice.
   */
  getByInvoiceId(invoiceId, callback) {
    const sql = `
      SELECT
        paymentId,
        invoiceId,
        userId,
        provider,
        status,
        amount,
        paymentRef,
        rawResponse,
        createdAt,
        updatedAt,
        paidAt,
        refundStatus,
        refundedAmount,
        refundRef,
        refundedAt
      FROM payments
      WHERE invoiceId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    db.query(sql, [invoiceId], (err, results) => {
      if (err) return callback(err);
      if (!results || !results.length) return callback(null, null);
      return callback(null, results[0]);
    });
  },

  /**
   * Update refund info for a payment row.
   */
  updateRefund(paymentId, refundStatus, refundedAmount, refundRef, refundedAt, rawResponse, callback) {
    const sql = `
      UPDATE payments
      SET refundStatus = ?, refundedAmount = ?, refundRef = ?, refundedAt = ?,
          status = ?, rawResponse = ?, updatedAt = NOW()
      WHERE paymentId = ?
    `;
    const status = refundStatus === 'refunded' ? 'refunded' : 'completed';
    db.query(
      sql,
      [refundStatus, refundedAmount, refundRef, refundedAt, status, rawResponse, paymentId],
      (err, result) => callback(err, result)
    );
  }
};

module.exports = Payment;

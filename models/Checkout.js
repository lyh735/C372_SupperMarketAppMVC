// models/Checkout.js
const db = require('../db');

const Checkout = {
  // Create a new checkout record
  create(userId, cartTotal, paymentMethod, callback) {
    const sql = `
      INSERT INTO checkouts (userId, cartTotal, paymentMethod, checkoutDate, status)
      VALUES (?, ?, ?, NOW(), 'pending')
    `;
    db.query(sql, [userId, cartTotal, paymentMethod], callback);
  },

  // Get checkout record by ID
  getById(checkoutId, callback) {
    const sql = `
      SELECT *
      FROM checkouts
      WHERE id = ?
      LIMIT 1
    `;
    db.query(sql, [checkoutId], (err, results) => {
      if (err) return callback(err);
      const row = results && results.length ? results[0] : null;
      callback(null, row);
    });
  },

  // Get all checkouts for a user
  getByUserId(userId, callback) {
    const sql = `
      SELECT *
      FROM checkouts
      WHERE userId = ?
      ORDER BY checkoutDate DESC
    `;
    db.query(sql, [userId], callback);
  },

  // Update checkout status
  updateStatus(checkoutId, status, callback) {
    const sql = `
      UPDATE checkouts
      SET status = ?
      WHERE id = ?
    `;
    db.query(sql, [status, checkoutId], callback);
  },

  // Update checkout with transaction details
  updateWithTransactionDetails(checkoutId, transactionId, transactionStatus, callback) {
    const sql = `
      UPDATE checkouts
      SET transactionId = ?, transactionStatus = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    db.query(sql, [transactionId, transactionStatus, checkoutId], callback);
  },

  // Get all checkouts (for admin)
  getAll(callback) {
    const sql = `
      SELECT *
      FROM checkouts
      ORDER BY checkoutDate DESC
    `;
    db.query(sql, callback);
  }
};

module.exports = Checkout;

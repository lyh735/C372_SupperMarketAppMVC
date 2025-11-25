const db = require('../db');

/**
 * Feedback model - function-based MVC style
 *
 * Tables assumed:
 * - feedback(id, userId, productId, rating, comment, createdAt, updatedAt)
 * - products(id, productName, price, image, ...)
 *
 * All functions are callback-based: fn(params..., callback(err, results))
 */

const Feedback = {
  // Get all feedback for a product, joined with user/product details
  getByProductId: function (productId, callback) {
    const sql = `
      SELECT f.id, f.userId, f.productId, f.rating, f.comment, f.createdAt, f.updatedAt
      FROM feedback f
      WHERE f.productId = ?
      ORDER BY f.createdAt DESC
    `;
    db.query(sql, [productId], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  // Get feedback by user and product (to check if user already left feedback)
  getByUserAndProduct: function (userId, productId, callback) {
    const sql = `
      SELECT id, userId, productId, rating, comment, createdAt, updatedAt
      FROM feedback
      WHERE userId = ? AND productId = ?
    `;
    db.query(sql, [userId, productId], (err, results) => {
      if (err) return callback(err);
      const feedback = results && results.length ? results[0] : null;
      return callback(null, feedback);
    });
  },

  // Get all feedback submitted by a user
  getByUserId: function (userId, callback) {
    const sql = `
      SELECT f.id, f.userId, f.productId, f.rating, f.comment, f.createdAt, f.updatedAt,
             p.productName, p.image
      FROM feedback f
      JOIN products p ON f.productId = p.id
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  // Create new feedback
  create: function (feedback, callback) {
    if (!feedback.userId || !feedback.productId || feedback.rating === undefined) {
      return callback(new Error('Missing required fields'));
    }
    const sql = `
      INSERT INTO feedback (userId, productId, rating, comment, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [feedback.userId, feedback.productId, feedback.rating, feedback.comment || null], (err, result) => {
      if (err) return callback(err);
      return callback(null, { id: result.insertId });
    });
  },

  // Update existing feedback
  update: function (feedbackId, feedback, callback) {
    const sql = `
      UPDATE feedback
      SET rating = ?, comment = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    db.query(sql, [feedback.rating, feedback.comment || null, feedbackId], (err, result) => {
      if (err) return callback(err);
      return callback(null, { affectedRows: result.affectedRows });
    });
  },

  // Delete feedback
  delete: function (feedbackId, callback) {
    const sql = 'DELETE FROM feedback WHERE id = ?';
    db.query(sql, [feedbackId], (err, result) => {
      if (err) return callback(err);
      return callback(null, { affectedRows: result.affectedRows });
    });
  }
};

module.exports = Feedback;

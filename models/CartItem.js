// models/CartItem.js
const db = require('../db');

/**
 * CartItems model
 *
 * Table: cartitems
 *  - cartItemId (PK, AUTO_INCREMENT)
 *  - userId
 *  - productId
 *  - quantity
 *
 * IMPORTANT: to allow quantity to merge properly, the table should have:
 *   UNIQUE KEY unique_user_product (userId, productId)
 */

const CartItems = {
  // Get all cart items for a user, joined with product info
  getByUserId(userId, callback) {
    const sql = `
      SELECT 
        c.productId,
        c.quantity,
        p.productName,
        p.price,
        p.image
      FROM cartitems c
      JOIN products p ON c.productId = p.id
      WHERE c.userId = ?
      ORDER BY c.productId
    `;
    db.query(sql, [userId], callback);
  },

  // Get a single cart row for a user + product (used for decrease)
  getByUserAndProduct(userId, productId, callback) {
    const sql = `
      SELECT cartItemId, userId, productId, quantity
      FROM cartitems
      WHERE userId = ? AND productId = ?
      LIMIT 1
    `;
    db.query(sql, [userId, productId], (err, results) => {
      if (err) return callback(err);
      const row = results && results.length ? results[0] : null;
      callback(null, row);
    });
  },

  /**
   * Add quantity to a cart line.
   * If the (userId, productId) pair already exists, quantity is increased.
   */
  add(userId, productId, quantity, callback) {
    const sql = `
      INSERT INTO cartitems (userId, productId, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;
    db.query(sql, [userId, productId, quantity], callback);
  },

  /**
   * Set quantity to an exact value.
   * If newQty <= 0, you should call remove() instead.
   */
  updateQuantity(userId, productId, newQty, callback) {
    const sql = `
      UPDATE cartitems
      SET quantity = ?
      WHERE userId = ? AND productId = ?
    `;
    db.query(sql, [newQty, userId, productId], callback);
  },

  // Remove a single product from this user's cart
  remove(userId, productId, callback) {
    const sql = `
      DELETE FROM cartitems
      WHERE userId = ? AND productId = ?
    `;
    db.query(sql, [userId, productId], callback);
  },

  // Clear all cart rows for a user
  clear(userId, callback) {
    const sql = `
      DELETE FROM cartitems
      WHERE userId = ?
    `;
    db.query(sql, [userId], callback);
  }
};

module.exports = CartItems;

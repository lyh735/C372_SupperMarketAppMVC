const db = require('../db');

const Shopping = {
  // Get all products (used by shopping listing)
  getAllProducts: function (callback) {
    const sql = `SELECT id AS productId, productName, quantity, price, image FROM products`;
    db.query(sql, (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  // Get a single product by id (basic)
  getProductById: function (id, callback) {
    const sql = `SELECT id AS productId, productName, quantity, price, image FROM products WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      const product = results && results.length ? results[0] : null;
      return callback(null, product);
    });
  },

  // Get product details intended for user display (includes availability flag)
  getProductDetails: function (id, callback) {
    const sql = `SELECT id AS productId, productName, quantity, price, image, (quantity > 0) AS available FROM products WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      const product = results && results.length ? results[0] : null;
      return callback(null, product);
    });
  }
};

module.exports = Shopping;

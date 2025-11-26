const db = require('../db');

const Shopping = {
  // Get all products (used by shopping listing)

  getAllProducts(callback) {
    const sql = `
      SELECT 
        p.id,                        
        p.productName,
        p.quantity,
        p.price,
        p.image,
        p.category,
        ROUND(AVG(f.rating), 1) AS avgRating,
        COUNT(f.id)            AS ratingCount
        FROM products p
        LEFT JOIN feedback f
        ON f.productId = p.id      
        GROUP BY 
        p.id, p.productName, p.quantity, p.price, p.image, p.category
        ORDER BY p.productName;
      `;

      db.query(sql, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
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

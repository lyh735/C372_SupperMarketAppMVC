// models/Invoice.js
const db = require('../db');

const Invoice = {
  /**
   * Create an invoice and its items inside a transaction.
   * items: array of { productId, quantity, price }
   * callback(err, { invoiceId, totalAmount })
   */
  createInvoice(userId, items, paymentMethod, paymentStatus, paymentRef, callback) {
    if (!userId) return callback(new Error('Missing userId'));
    if (!items || !items.length) return callback(new Error('No items to invoice'));

    // compute total
    const totalAmount = items.reduce((sum, it) => {
      const price = parseFloat(it.price) || 0;
      const qty = parseInt(it.quantity, 10) || 0;
      return sum + price * qty;
    }, 0);

    db.beginTransaction((txErr) => {
      if (txErr) return callback(txErr);

      const sqlInvoice = `
        INSERT INTO invoices (userId, totalAmount, paymentMethod, paymentStatus, paymentRef, paidAt, createdAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
      db.query(sqlInvoice, [userId, totalAmount, paymentMethod, paymentStatus, paymentRef], (insErr, insRes) => {
        if (insErr) {
          return db.rollback(() => callback(insErr));
        }

        const invoiceId = insRes.insertId;

        // bulk insert invoiceitems
        const placeholders = items.map(() => '(?, ?, ?, ?)').join(',');
        const values = [];
        items.forEach((it) => {
          values.push(invoiceId, it.productId, it.quantity, it.price);
        });

        const sqlItems = `
          INSERT INTO invoiceitems (invoiceId, productId, quantity, price)
          VALUES ${placeholders}
        `;
        db.query(sqlItems, values, (itemsErr) => {
          if (itemsErr) {
            return db.rollback(() => callback(itemsErr));
          }

          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => callback(commitErr));
            }
            // success
            return callback(null, { invoiceId, totalAmount });
          });
        });
      });
    });
  },

  /**
   * Get an overview / history of invoices for one user.
   * Returns [ { invoiceId, userId, createdAt, totalAmount, paymentMethod, paymentStatus, paymentRef, paidAt }, ... ]
   */
  invoiceOverview(userId, callback) {
    const sql = `
      SELECT invoiceId, userId, createdAt, totalAmount, paymentMethod, paymentStatus, paymentRef, paidAt
      FROM invoices
      WHERE userId = ?
      ORDER BY createdAt DESC
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  /**
   * Get all invoices for admin view (all users).
   * Returns rows: { invoiceId, userId, username, createdAt, totalAmount, paymentMethod, paymentStatus, paymentRef, paidAt }
   */
  allInvoices(callback) {
    const sql = `
      SELECT 
        i.invoiceId,
        i.userId,
        u.username,
        i.createdAt,
        i.totalAmount,
        i.paymentMethod,
        i.paymentStatus,
        i.paymentRef,
        i.paidAt
      FROM invoices i
      JOIN users u ON i.userId = u.id
      ORDER BY i.createdAt DESC
    `;
    db.query(sql, [], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  /**
   * Get the details (items) for a specific invoice ID.
   * Returns rows: { productId, productName, quantity, price, lineTotal, image }
   */
  invoiceDetails(invoiceId, callback) {
    const sql = `
      SELECT
        ii.productId,
        p.productName,
        ii.quantity,
        ii.price,
        (ii.quantity * ii.price) AS lineTotal,
        p.image
      FROM invoiceitems ii
      JOIN products p ON ii.productId = p.id
      WHERE ii.invoiceId = ?
      ORDER BY p.productName
    `;
    db.query(sql, [invoiceId], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  },

  /**
   * Get a single invoice by ID (admin can view any invoice).
   * Returns: { invoiceId, userId, totalAmount, createdAt, paymentMethod, paymentStatus, paymentRef, paidAt }
   */
  getInvoiceById(invoiceId, callback) {
    const sql = `
      SELECT invoiceId, userId, totalAmount, createdAt, paymentMethod, paymentStatus, paymentRef, paidAt
      FROM invoices
      WHERE invoiceId = ?
    `;
    db.query(sql, [invoiceId], (err, results) => {
      if (err) return callback(err);
      if (!results || !results.length) {
        return callback(null, null);
      }
      return callback(null, results[0]);
    });
  }
};

module.exports = Invoice;

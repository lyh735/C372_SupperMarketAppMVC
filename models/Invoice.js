// models/Invoice.js
const db = require('../db');

const Invoice = {
  /**
   * Create an invoice and its items inside a transaction.
   * items: array of { productId, quantity, price }
   * callback(err, { invoiceId, totalAmount })
   */
  createInvoice(userId, items, callback) {
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
        INSERT INTO invoices (userId, totalAmount, createdAt)
        VALUES (?, ?, NOW())
      `;
      db.query(sqlInvoice, [userId, totalAmount], (insErr, insRes) => {
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
   * Returns [ { invoiceId, userId, createdAt, totalAmount }, ... ]
   */
  invoiceOverview(userId, callback) {
    const sql = `
      SELECT invoiceId, userId, createdAt, totalAmount
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
   * Get all items for a single invoice.
   * Returns rows:
   *  { productId, productName, quantity, price, lineTotal, image }
   */
  invoiceDetails(invoiceId, callback) {
    const sql = `
      SELECT 
        p.id AS productId,
        p.productName,
        ii.quantity,
        ii.price,
        (ii.quantity * ii.price) AS lineTotal,
        p.image
      FROM invoiceitems ii
      JOIN products p ON ii.productId = p.id
      WHERE ii.invoiceId = ?
    `;
    db.query(sql, [invoiceId], (err, results) => {
      if (err) return callback(err);
      return callback(null, results);
    });
  }
};

module.exports = Invoice;

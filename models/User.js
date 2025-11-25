// models/User.js
const db = require('../db');

const User = {
  // Get user by email (used for login)
  getByEmail(email, callback) {
    const sql = `
      SELECT 
        id AS userId,
        username,
        email,
        password,
        address,
        contact,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
    `;

    db.query(sql, [email], (err, results) => {
      if (err) return callback(err);

      const row = results && results.length ? results[0] : null;
      if (!row) return callback(null, null);

      callback(null, row);
    });
  },

  // Create a user (password already hashed with sha1 in controller)
  create(newUser, callback) {
    const sql = `
      INSERT INTO users (username, email, password, address, contact, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newUser.username,
      newUser.email,
      newUser.password,  // sha1 hash string
      newUser.address,
      newUser.contact,
      newUser.role || 'user'
    ];

    db.query(sql, params, (err, result) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  }
};

module.exports = User;

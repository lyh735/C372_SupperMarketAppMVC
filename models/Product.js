const db = require('../db');

const Product = {
	// Get all products
	getAllProducts: function (callback) {
		const sql = `SELECT id AS id, productName, quantity, price, image, category FROM products`;
		db.query(sql, (err, results) => {
			if (err) return callback(err);
			return callback(null, results);
		});
	},

	// Get a single product by its id
	getProductById: function (id, callback) {
		const sql = `SELECT id AS id, productName, quantity, price, image, category FROM products WHERE id = ?`;
		db.query(sql, [id], (err, results) => {
			if (err) return callback(err);
			const product = results && results.length ? results[0] : null;
			return callback(null, product);
		});
	},

	// Add a new product (expects an object with keys: productName, quantity, price, image, category)
	addProduct: function (product, callback) {
		const sql = `INSERT INTO products (productName, quantity, price, image, category) VALUES (?, ?, ?, ?, ?)`;
		const params = [product.productName, product.quantity, product.price, product.image, product.category];
		db.query(sql, params, (err, result) => {
			if (err) return callback(err);
			// return newly created id and affectedRows info
			return callback(null, { insertId: result.insertId, affectedRows: result.affectedRows });
		});
	},

	// Update an existing product by id
	updateProduct: function (id, product, callback) {
		const sql = `UPDATE products SET productName = ?, quantity = ?, price = ?, image = ?, category = ? WHERE id = ?`;
		const params = [product.productName, product.quantity, product.price, product.image, product.category, id];
		db.query(sql, params, (err, result) => {
			if (err) return callback(err);
			return callback(null, { affectedRows: result.affectedRows, changedRows: result.changedRows });
		});
	},

	// Delete a product by id
	deleteProduct: function (id, callback) {
		const sql = `DELETE FROM products WHERE id = ?`;
		db.query(sql, [id], (err, result) => {
			if (err) return callback(err);
			return callback(null, { affectedRows: result.affectedRows });
		});
	}
};

module.exports = Product;
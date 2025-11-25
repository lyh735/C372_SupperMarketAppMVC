const Product = require('../models/Product');

const ProductController = {
  // Admin inventory list
  listAll(req, res) {
    Product.getAllProducts((err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).send('Error fetching products');
      }

      res.render('inventory', {
        products,
        user: req.session.user
      });
    });
  },

  // Show add form (not strictly needed if app.js renders addProduct.ejs directly)
  showAddForm(req, res) {
    res.render('addProduct', { user: req.session.user });
  },

  // Handle adding a product
  addProduct(req, res) {
    const product = {
      productName: req.body.name,
      quantity: req.body.quantity,
      price: req.body.price,
      image: req.file ? req.file.filename : null
    };

    Product.addProduct(product, (err) => {
      if (err) {
        console.error('Error adding product:', err);
        return res.status(500).send('Error adding product');
      }
      res.redirect('/inventory');
    });
  },

  // Show edit form
  showEditForm(req, res) {
    const id = req.params.id;

    Product.getProductById(id, (err, product) => {
      if (err) {
        console.error('Error fetching product:', err);
        return res.status(500).send('Error fetching product');
      }

      // If not found, still render view but with no product
      if (!product) {
        return res.render('updateProduct', {
          product: null,
          user: req.session.user
        });
      }

      // Render your updateProduct.ejs and pass `product`
      res.render('updateProduct', {
        product,
        user: req.session.user
      });
    });
  },

  // Handle update POST
  updateProduct(req, res) {
    const id = req.params.id;

    const updatedProduct = {
      productName: req.body.name,
      quantity: req.body.quantity,
      price: req.body.price,
      image: req.file ? req.file.filename : req.body.currentImage
    };

    Product.updateProduct(id, updatedProduct, (err) => {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).send('Error updating product');
      }
      res.redirect('/inventory');
    });
  },

  // Delete a product
  deleteProduct(req, res) {
    const id = req.params.id;

    Product.deleteProduct(id, (err) => {
      if (err) {
        console.error('Error deleting product:', err);
        return res.status(500).send('Error deleting product');
      }
      res.redirect('/inventory');
    });
  }
};

module.exports = ProductController;

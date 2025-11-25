// controllers/CartItermsController.js
const CartItems = require('../models/CartItem');
const Products = require('../models/Product');
const Invoice = require('../models/Invoice');

const CartItemsController = {

  // Show cart page
  list(req, res) {
    const userId = req.session.user.userId;

    CartItems.getByUserId(userId, (err, rows) => {
      if (err) {
        console.error('Error retrieving cart items:', err);
        return res.status(500).send('Error retrieving cart');
      }

      // Normalize to the structure used by cart.ejs
      const cart = (rows || []).map(r => ({
        productId: r.productId,
        productName: r.productName,
        price: r.price,
        quantity: r.quantity,
        image: r.image
      }));

      res.render('cart', {
        cart,
        user: req.session.user
      });
    });
  },

  // Add item to cart (from product page)
  add(req, res) {
    const userId = req.session.user.userId;
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity || '1', 10);

    Products.getProductById(productId, (err, product) => {
      if (err || !product) {
        req.flash('error', 'Product not found');
        return res.redirect('/shopping');
      }

      CartItems.add(userId, productId, quantity, (addErr) => {
        if (addErr) {
          console.error('Error adding to cart:', addErr);
          req.flash('error', 'Unable to add to cart');
        } else {
          req.flash('success', 'Added to cart successfully');
        }
        res.redirect('/cart');
      });
    });
  },

  // Increase quantity by 1 (for "+" button)
  increase(req, res) {
    const userId = req.session.user.userId;
    const productId = parseInt(req.body.productId, 10);

    CartItems.add(userId, productId, 1, (err) => {
      if (err) {
        console.error('Error increasing cart quantity:', err);
        req.flash('error', 'Could not update quantity');
      }
      res.redirect('/cart');
    });
  },

  // Decrease quantity by 1 (for "-" button)
  decrease(req, res) {
    const userId = req.session.user.userId;
    const productId = parseInt(req.body.productId, 10);

    CartItems.getByUserAndProduct(userId, productId, (err, row) => {
      if (err) {
        console.error('Error reading cart item:', err);
        req.flash('error', 'Could not update quantity');
        return res.redirect('/cart');
      }

      if (!row) {
        // Nothing to do
        return res.redirect('/cart');
      }

      const newQty = row.quantity - 1;

      if (newQty <= 0) {
        // remove row completely
        CartItems.remove(userId, productId, (remErr) => {
          if (remErr) {
            console.error('Error removing cart item:', remErr);
            req.flash('error', 'Could not update quantity');
          }
          res.redirect('/cart');
        });
      } else {
        // update quantity
        CartItems.updateQuantity(userId, productId, newQty, (updErr) => {
          if (updErr) {
            console.error('Error updating cart quantity:', updErr);
            req.flash('error', 'Could not update quantity');
          }
          res.redirect('/cart');
        });
      }
    });
  },

  // Remove a product from cart (Remove button)
  remove(req, res) {
    const userId = req.session.user.userId;
    const productId = parseInt(req.body.productId, 10);

    CartItems.remove(userId, productId, (err) => {
      if (err) {
        console.error('Error removing from cart:', err);
        req.flash('error', 'Could not remove from cart');
      } else {
        req.flash('success', 'Item removed');
      }
      res.redirect('/cart');
    });
  },

  // Clear entire cart
  clear(req, res) {
    const userId = req.session.user.userId;

    CartItems.clear(userId, (err) => {
      if (err) {
        console.error('Error clearing cart:', err);
        req.flash('error', 'Could not clear cart');
      } else {
        req.flash('success', 'Cart cleared');
      }
      res.redirect('/cart');
    });
  },

  // Checkout: create invoice + clear cart + redirect to invoice page
  checkout(req, res) {
    const userId = req.session.user.userId;

    CartItems.getByUserId(userId, (err, cartRows) => {
      if (err) {
        console.error('Error fetching cart for checkout:', err);
        req.flash('error', 'Server error during checkout');
        return res.redirect('/cart');
      }

      if (!cartRows || !cartRows.length) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/cart');
      }

      const items = cartRows.map(r => ({
        productId: r.productId,
        quantity: r.quantity,
        price: r.price
      }));

      Invoice.createInvoice(userId, items, (invErr, result) => {
        if (invErr) {
          console.error('Error creating invoice:', invErr);
          req.flash('error', 'Could not complete checkout');
          return res.redirect('/cart');
        }

        CartItems.clear(userId, (clearErr) => {
          if (clearErr) {
            console.error('Error clearing cart after checkout:', clearErr);
          }
          req.flash('success', 'Checkout successful');
          res.redirect('/invoice/' + result.invoiceId);
        });
      });
    });
  }
};

module.exports = CartItemsController;

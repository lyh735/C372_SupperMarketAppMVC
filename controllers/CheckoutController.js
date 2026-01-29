// controllers/CheckoutController.js
const CartItem = require('../models/CartItem');

/**
 * Checkout Handler
 * Validates user session, retrieves cart items, validates cart is not empty,
 * calculates total, stores in session, and routes to appropriate payment gateway
 */
const checkout = (req, res) => {
  // 1. Validate user is logged in
  if (!req.session.userId) {
    req.flash('error', 'You must be logged in to checkout.');
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  // 2. Retrieve user's cart items from CartItem model
  CartItem.getByUserId(userId, (err, cartItems) => {
    if (err) {
      console.error('Error retrieving cart items:', err);
      req.flash('error', 'An error occurred while retrieving your cart.');
      return res.redirect('/cart');
    }

    // 3. Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      req.flash('error', 'Your cart is empty. Please add items before checking out.');
      return res.redirect('/cart');
    }

    // 4. Calculate cart total
    const cartTotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // 5. Store pendingCart and cartTotal in session
    req.session.pendingCart = cartItems;
    req.session.cartTotal = cartTotal;

    // 6. Read payment method from request body
    const paymentMethod = req.body.paymentMethod;

    // 7. Route to appropriate payment gateway based on payment method
    if (paymentMethod === 'paypal') {
      return res.redirect('/paypal/checkout');
    } else if (paymentMethod === 'nets') {
    return netsController.generateNETSQR(req, res);
    } else {
      req.flash('error', 'Invalid payment method selected.');
      return res.redirect('/cart');
    }
  });
};

module.exports = {
  checkout
};

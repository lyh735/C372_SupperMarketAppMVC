const Product = require('../models/Product');
const CartItems = require('../models/CartItem');
const Feedback = require('../models/Feedback');

/**
 * ShoppingController - controller for shopping-related routes
 * Methods: listAll, getProduct, addToCart, viewCart
 */

const ShoppingController = {
  // List all products for shopping
  listAll: (req, res) => {
    Product.getAllProducts((err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).send('Error retrieving products');
      }

      const user = req.session ? req.session.user : null;
      const normalized = (products || []).map(p => ({ ...p, id: p.id || p.productId }));
      return res.render('shopping', { products: normalized, user });
    });
  },

  // Get a single product's details by ID
  getProduct: (req, res) => {
    const id = parseInt(req.params.id, 10);
    Product.getProductById(id, (err, product) => {
      if (err) {
        console.error('Error fetching product:', err);
        return res.status(500).send('Error retrieving product');
      }
      if (!product) return res.status(404).send('Product not found');

      const user = req.session ? req.session.user : null;
      product.id = product.id || product.productId;
      // Fetch all feedback for this product and also user's feedback (if logged in)
      Feedback.getByProductId(product.id, (fbErr, allFeedback) => {
        if (fbErr) {
          console.error('Error fetching feedback for product:', fbErr);
          // still render the product page without feedback
          return res.render('product', { product, user, allFeedback: [], userFeedback: null });
        }

        if (!user) {
          return res.render('product', { product, user, allFeedback: allFeedback || [], userFeedback: null });
        }

        const userId = user.userId || user.id || user.user_id;
        Feedback.getByUserAndProduct(userId, product.id, (uFbErr, userFeedback) => {
          if (uFbErr) {
            console.error('Error fetching user feedback:', uFbErr);
            return res.render('product', { product, user, allFeedback: allFeedback || [], userFeedback: null });
          }
          return res.render('product', { product, user, allFeedback: allFeedback || [], userFeedback: userFeedback || null });
        });
      });
    });
  },

  // Add a product to the user's cart
  addToCart: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to add items to cart');
      return res.redirect('/login');
    }

    const userId = req.session.user.userId || req.session.user.id;
    const productId = parseInt(req.params.id, 10);
    const qty = parseInt(req.body.quantity, 10) || 1;

    Product.getProductById(productId, (err, product) => {
      if (err) {
        console.error('Error fetching product for cart:', err);
        req.flash('error', 'Server error');
        return res.redirect('/shopping');
      }
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/shopping');
      }

      // The CartItems model stores one row per added item. Add `qty` times or rely on a single insert.
      // We'll insert a single row and rely on display logic to count duplicates if multiple inserts exist.
      CartItems.add(userId, productId, (addErr) => {
        if (addErr) {
          console.error('Error adding to cart:', addErr);
          req.flash('error', 'Could not add to cart');
          return res.redirect('/product/' + productId);
        }
        req.flash('success', 'Product added to cart');
        return res.redirect('/cart');
      });
    });
  },

  // Display the current user's cart
  viewCart: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to view cart');
      return res.redirect('/login');
    }

    const userId = req.session.user.userId || req.session.user.id;
    CartItems.getByUserId(userId, (err, cartRows) => {
      if (err) {
        console.error('Error retrieving cart items:', err);
        return res.status(500).send('Error retrieving cart');
      }

      if (!cartRows || !cartRows.length) {
        const user = req.session ? req.session.user : null;
        return res.render('cart', { cart: [], user });
      }

      // cartRows likely contain a `cartItemId` column referencing the product id.
      const counts = {};
      cartRows.forEach(r => {
        const pid = r.cartItemId || r.productId || r.cart_item_id || r.cartItem || r.id;
        if (!pid) return;
        counts[pid] = (counts[pid] || 0) + 1;
      });

      const uniqueIds = Object.keys(counts).map(id => parseInt(id, 10));

      // Fetch product details for each unique id
      const productPromises = uniqueIds.map(pid => new Promise((resolve) => {
        Product.getProductById(pid, (pErr, product) => {
          if (pErr || !product) return resolve(null);
          product.id = product.id || product.productId || pid;
          resolve({
            id: product.id,
            productName: product.productName,
            price: product.price,
            image: product.image,
            quantity: counts[pid] || 1
          });
        });
      }));

      Promise.all(productPromises)
        .then(products => {
          const cart = (products || []).filter(Boolean);
          const user = req.session ? req.session.user : null;
          return res.render('cart', { cart, user });
        })
        .catch((e) => {
          console.error('Error assembling cart products:', e);
          return res.status(500).send('Error retrieving cart');
        });
    });
  }
};

module.exports = ShoppingController;

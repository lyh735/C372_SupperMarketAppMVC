const Product = require('../models/Product');
const CartItems = require('../models/CartItem');
const Feedback = require('../models/Feedback');

/**
 * ShoppingController - controller for shopping-related routes
 * Methods: listAll, getProduct, addToCart, viewCart
 */

const ShoppingController = {
  // List all products for shopping with search and filter
  listAll: (req, res) => {
    const user = req.session ? req.session.user : null;

    // Prevent admins from accessing the shopping storefront
    if (user && (user.role && String(user.role).toLowerCase() === 'admin')) {
      req.flash('error', 'Admins cannot access the shopping storefront. Use the inventory management page.');
      return res.redirect('/inventory');
    }

    Product.getAllProducts((err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).send('Error retrieving products');
      }

      const normalized = (products || []).map(p => ({ ...p, id: p.id || p.productId }));

      // Get filter parameters from query string
      const searchQuery = (req.query.search || '').toLowerCase().trim();
      const priceSort = req.query.priceSort || ''; // 'asc', 'desc'
      const categoryFilter = req.query.category || ''; // specific category or empty for all
      const ratingSort = req.query.ratingSort || ''; // 'highest', 'lowest', 'no-rating'

      // Extract unique categories
      const categories = [...new Set(normalized.map(p => p.category).filter(Boolean))].sort();

      // Apply filters and search
      let filtered = normalized.filter(product => {
        // Search by product name
        if (searchQuery && !product.productName.toLowerCase().includes(searchQuery)) {
          return false;
        }

        // Filter by category
        if (categoryFilter && product.category !== categoryFilter) {
          return false;
        }

        return true;
      });

      // Fetch feedback ratings for each product for sorting
      const feedbackPromises = filtered.map(product => 
        new Promise(resolve => {
          Feedback.getByProductId(product.id, (err, feedbacks) => {
            if (err || !feedbacks || feedbacks.length === 0) {
              product.avgRating = null;
              product.ratingCount = 0;
              return resolve();
            }
            const avgRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length;
            product.avgRating = avgRating;
            product.ratingCount = feedbacks.length;
            resolve();
          });
        })
      );

      Promise.all(feedbackPromises)
        .then(() => {
          // Sort by price
          if (priceSort === 'asc') {
            filtered.sort((a, b) => a.price - b.price);
          } else if (priceSort === 'desc') {
            filtered.sort((a, b) => b.price - a.price);
          }

          // Sort by rating
          if (ratingSort === 'highest') {
            filtered.sort((a, b) => {
              const aRating = a.avgRating || 0;
              const bRating = b.avgRating || 0;
              return bRating - aRating;
            });
          } else if (ratingSort === 'lowest') {
            filtered.sort((a, b) => {
              const aRating = a.avgRating || 0;
              const bRating = b.avgRating || 0;
              return aRating - bRating;
            });
          } else if (ratingSort === 'no-rating') {
            filtered.sort((a, b) => {
              const aHasRating = a.avgRating !== null && a.avgRating !== undefined;
              const bHasRating = b.avgRating !== null && b.avgRating !== undefined;
              if (aHasRating === bHasRating) return 0;
              return aHasRating ? 1 : -1;
            });
          }

          return res.render('shopping', { 
            products: filtered, 
            user,
            categories,
            searchQuery,
            priceSort,
            categoryFilter,
            ratingSort
          });
        })
        .catch((e) => {
          console.error('Error fetching feedback:', e);
          return res.render('shopping', { 
            products: filtered, 
            user,
            categories,
            searchQuery,
            priceSort,
            categoryFilter,
            ratingSort
          });
        });
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
    const user = req.session ? req.session.user : null;
    if (!user) {
      req.flash('error', 'Please log in to add items to cart');
      return res.redirect('/login');
    }

    // Admins are not allowed to purchase
    if (user.role && String(user.role).toLowerCase() === 'admin') {
      req.flash('error', 'Admins cannot purchase products. Use the inventory management page.');
      return res.redirect('/inventory');
    }

    const userId = user.userId || user.id;
    const productId = parseInt(req.params.id, 10);
    const qty = parseInt(req.body.quantity, 10) || 1;

    // Validate quantity is positive
    if (qty <= 0) {
      req.flash('error', 'Quantity must be at least 1');
      return res.redirect('/product/' + productId);
    }

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

      // Validate requested quantity does not exceed available quantity
      if (qty > product.quantity) {
        req.flash('error', `Only ${product.quantity} units available`);
        return res.redirect('/product/' + productId);
      }

      // The CartItems model stores one row per added item. Add `qty` times or rely on a single insert.
      // We'll insert a single row and rely on display logic to count duplicates if multiple inserts exist.
      CartItems.add(userId, productId, qty, (addErr) => {
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
    const user = req.session ? req.session.user : null;
    if (!user) {
      req.flash('error', 'Please log in to view cart');
      return res.redirect('/login');
    }

    // Admins should not have a cart or perform purchases
    if (user.role && String(user.role).toLowerCase() === 'admin') {
      req.flash('error', 'Admins cannot use the shopping cart. Use the inventory page to manage products.');
      return res.redirect('/inventory');
    }

    const userId = user.userId || user.id;
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
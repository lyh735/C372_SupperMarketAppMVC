const Product = require('../models/Product');
const Feedback = require('../models/Feedback');

/**
 * FeedbackController - function-based MVC controller for feedback operations
 * Methods: listAllProducts, getProductDetails, submitFeedback, editFeedback
 */

const FeedbackController = {
  // List all products available for feedback
  listAllProducts: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash && req.flash('error', 'Please log in to leave feedback');
      return res.redirect('/login');
    }

    Product.getAllProducts((err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).send('Error retrieving products');
      }

      const user = req.session.user;
      const messages = req.flash('success') || [];
      const errors = req.flash('error') || [];
      return res.render('feedbackList', { products, user, messages, errors });
    });
  },

  // Get a single product's details with existing feedback
  getProductDetails: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash && req.flash('error', 'Please log in');
      return res.redirect('/login');
    }

    const productId = parseInt(req.params.id, 10);
    const userId = req.session.user.userId || req.session.user.id || req.session.user.user_id;

    // Fetch product
    Product.getProductById(productId, (err, product) => {
      if (err) {
        console.error('Error fetching product:', err);
        return res.status(500).send('Error retrieving product');
      }
      if (!product) {
        return res.status(404).send('Product not found');
      }

      // Check if user has already submitted feedback for this product
      Feedback.getByUserAndProduct(userId, productId, (fbErr, userFeedback) => {
        if (fbErr) {
          console.error('Error fetching user feedback:', fbErr);
          return res.status(500).send('Error retrieving feedback');
        }

        // Get all feedback for this product
        Feedback.getByProductId(productId, (allFbErr, allFeedback) => {
          if (allFbErr) {
            console.error('Error fetching product feedback:', allFbErr);
            return res.status(500).send('Error retrieving feedback');
          }

          const user = req.session.user;
          const messages = req.flash('success') || [];
          const errors = req.flash('error') || [];
          return res.render('feedbackDetails', {
            product,
            userFeedback,
            allFeedback: allFeedback || [],
            user,
            messages,
            errors
          });
        });
      });
    });
  },

  // Submit new feedback or show form
  submitFeedback: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash && req.flash('error', 'Please log in to submit feedback');
      return res.redirect('/login');
    }

    const productId = parseInt(req.params.id || req.body.productId, 10);
    const userId = req.session.user.userId || req.session.user.id || req.session.user.user_id;

    // If GET request, show feedback form
    if (req.method === 'GET') {
      Product.getProductById(productId, (err, product) => {
        if (err || !product) {
          return res.status(404).send('Product not found');
        }
        const messages = req.flash('success') || [];
        const errors = req.flash('error') || [];
        return res.render('feedbackForm', { product, user: req.session.user, messages, errors });
      });
      return;
    }

    // POST: Handle form submission
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please provide a rating between 1 and 5');
      return res.redirect(`/feedback/product/${productId}/submit`);
    }

    const newFeedback = {
      userId,
      productId,
      rating: parseInt(rating, 10),
      comment: comment || ''
    };

    Feedback.create(newFeedback, (err, result) => {
      if (err) {
        console.error('Error creating feedback:', err);
        req.flash('error', 'Could not submit feedback');
        return res.redirect(`/feedback/product/${productId}/submit`);
      }

      req.flash('success', 'Feedback submitted successfully');
      return res.redirect(`/feedback/product/${productId}`);
    });
  },

  // Edit existing feedback
  editFeedback: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash && req.flash('error', 'Please log in');
      return res.redirect('/login');
    }

    const feedbackId = parseInt(req.params.feedbackId, 10);
    const userId = req.session.user.userId || req.session.user.id || req.session.user.user_id;

    // If GET request, show edit form
    if (req.method === 'GET') {
      Feedback.getByUserAndProduct(userId, parseInt(req.query.productId, 10), (err, feedback) => {
        if (err || !feedback) {
          req.flash('error', 'Feedback not found');
          return res.redirect('/feedback');
        }

        Product.getProductById(feedback.productId, (pErr, product) => {
          if (pErr || !product) {
            return res.status(500).send('Error loading product');
          }

          const messages = req.flash('success') || [];
          const errors = req.flash('error') || [];
          return res.render('feedbackEditForm', {
            feedback,
            product,
            user: req.session.user,
            messages,
            errors
          });
        });
      });
      return;
    }

    // POST: Handle form submission
    const { rating, comment, productId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please provide a rating between 1 and 5');
      return res.redirect(`/feedback/edit/${feedbackId}?productId=${productId}`);
    }

    const updatedFeedback = {
      rating: parseInt(rating, 10),
      comment: comment || ''
    };

    Feedback.update(feedbackId, updatedFeedback, (err) => {
      if (err) {
        console.error('Error updating feedback:', err);
        req.flash('error', 'Could not update feedback');
        return res.redirect(`/feedback/edit/${feedbackId}?productId=${productId}`);
      }

      req.flash('success', 'Feedback updated successfully');
      return res.redirect(`/feedback/product/${productId}`);
    });
  },

  // Delete feedback
  deleteFeedback: (req, res) => {
    if (!req.session || !req.session.user) {
      req.flash && req.flash('error', 'Please log in');
      return res.redirect('/login');
    }

    const feedbackId = parseInt(req.params.feedbackId, 10);
    const productId = req.body.productId || req.query.productId;

    Feedback.delete(feedbackId, (err) => {
      if (err) {
        console.error('Error deleting feedback:', err);
        req.flash('error', 'Could not delete feedback');
        return res.redirect(`/feedback/product/${productId}`);
      }

      req.flash('success', 'Feedback deleted successfully');
      return res.redirect(`/feedback/product/${productId}`);
    });
  }
};

module.exports = FeedbackController;

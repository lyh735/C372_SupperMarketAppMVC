// controllers/UserController.js
const crypto = require('crypto');
const User = require('../models/User');

const UserController = {
  // Show registration form
  showRegister(req, res) {
    const formData = req.flash('formData')[0] || {};
    const errors = req.flash('error') || [];
    const messages = req.flash('success') || [];

    res.render('register', {
      formData,
      errors,
      messages,
      user: req.session.user
    });
  },

  // Handle registration
  registerUser(req, res) {
    const {
      username,
      email,
      password,
      confirmPassword,
      address,
      contact,
      role
    } = req.body;

    // 1) Check passwords match
    if (!password || !confirmPassword || password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      req.flash('formData', req.body);
      return res.redirect('/register');
    }

    // 2) Check if email already exists
    User.getByEmail(email, (err, existingUser) => {
      if (err) {
        console.error('Error checking existing email:', err);
        req.flash('error', 'Server error while checking email');
        req.flash('formData', req.body);
        return res.redirect('/register');
      }

      if (existingUser) {
        // Email is already used by another account
        req.flash('error', 'This email is already registered. Please log in instead.');
        req.flash('formData', req.body);
        return res.redirect('/register');
      }

      // 3) Email is free → hash password and create user
      const hashedPassword = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex');

      const newUser = {
        username,
        email,
        password: hashedPassword,
        address,
        contact,
        role: role || 'user'
      };

      User.create(newUser, (createErr) => {
        if (createErr) {
          // Extra safety: if DB has UNIQUE(email) and still hits duplicate
          if (createErr.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'This email is already registered. Please log in instead.');
            req.flash('formData', req.body);
            return res.redirect('/register');
          }

          console.error('Error creating user:', createErr);
          req.flash('error', 'Unable to register user');
          req.flash('formData', req.body);
          return res.redirect('/register');
        }

        req.flash('success', 'Registration successful. Please log in.');
        return res.redirect('/login');
      });
    });
  },

  // Show login form
  showLogin(req, res) {
    const formData = req.flash('formData')[0] || {};
    const errors = req.flash('error') || [];
    const messages = req.flash('success') || [];
    res.render('login', {
      formData,
      errors,
      messages,
      user: req.session.user
    });
  },

  // Handle login
  loginUser(req, res) {
    const { email, password } = req.body;

    User.getByEmail(email, (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).send('Server error');
      }

      if (!user) {
        req.flash('error', 'Invalid email or password');
        req.flash('formData', req.body);
        return res.redirect('/login');
      }

      const hashedInput = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex');

      if (hashedInput !== user.password) {
        req.flash('error', 'Invalid email or password');
        req.flash('formData', req.body);
        return res.redirect('/login');
      }

      // Store user in session
      req.session.user = {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role
      };

      req.flash('success', 'Logged in successfully');

      if (user.role === 'admin') {
        return res.redirect('/inventory');
      } else {
        return res.redirect('/shopping');
      }
    });
  },

  // Logout
  logoutUser(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
};

module.exports = UserController;
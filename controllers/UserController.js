// controllers/UserController.js
const crypto = require('crypto');
const User = require('../models/User');

const UserController = {
  showRegister(req, res) {
    const formData = req.flash('formData')[0] || {};
    const errors = req.flash('error') || [];
    res.render('register', { formData, errors, user: req.session.user });
  },

  registerUser(req, res) {
    const { username, email, password, address, contact, role } = req.body;

    // basic validation is already done by validateRegistration in app.js
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    const newUser = {
      username,
      email,
      password: hashedPassword,
      address,
      contact,
      role: role || 'user'
    };

    User.create(newUser, (err) => {
      if (err) {
        console.error('Error creating user:', err);
        req.flash('error', 'Unable to register user');
        req.flash('formData', req.body);
        return res.redirect('/register');
      }

      req.flash('success', 'Registration successful. Please log in.');
      res.redirect('/login');
    });
  },

  showLogin(req, res) {
    const formData = req.flash('formData')[0] || {};
    const errors = req.flash('error') || [];
    const messages = req.flash('success') || [];
    res.render('login', { formData, errors, messages, user: req.session.user });
  },

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

      const hashedInput = crypto.createHash('sha1').update(password).digest('hex');

      if (hashedInput !== user.password) {
        req.flash('error', 'Invalid email or password');
        req.flash('formData', req.body);
        return res.redirect('/login');
      }

      // ✅ session userId is now correct
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

  logoutUser(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
};

module.exports = UserController;

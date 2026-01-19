const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const CartItemsController = require('./controllers/CartItermsController');
const InvoiceController = require('./controllers/InvoiceController');
const ProductController = require('./controllers/ProductController');
const ShoppingController = require('./controllers/ShoppingController');
const UserController = require('./controllers/UserController');
const FeedbackController = require('./controllers/FeedbackController');
const { checkAuthenticated, checkAuthorised } = require('./middleware');
const netsQr = require('./services/nets');

const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images'),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Session + flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(flash());

// Simple registration validator used by the register route
const validateRegistration = (req, res, next) => {
  const { username, email, password, confirmPassword, address, contact, role } = req.body;
  if (!username || !email || !password || !confirmPassword || !address || !contact || !role) {
    return res.status(400).send('All fields are required.');
  }
  if (password.length < 6) {
    req.flash('error', 'Password should be at least 6 or more characters long');
    req.flash('formData', req.body);
    return res.redirect('/register');
  }
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    req.flash('formData', req.body);
    return res.redirect('/register');
  }
  next();
};

// Define routes
app.get('/', (req, res) => res.render('index', { user: req.session.user }));

// Use controllers for product/shopping/invoice flows
app.get('/inventory', checkAuthenticated, checkAuthorised(['admin']), ProductController.listAll);
app.get('/admin/products', checkAuthenticated, checkAuthorised(['admin']),ProductController.listAll);
app.get('/shopping', checkAuthenticated, ShoppingController.listAll);

app.get('/register', UserController.showRegister);
app.post('/register', validateRegistration, UserController.registerUser);

app.get('/login', UserController.showLogin);
app.post('/login', UserController.loginUser);

// Shopping routes handled by ShoppingController
app.get('/shopping', checkAuthenticated, ShoppingController.listAll);
app.get('/product/:id', checkAuthenticated, ShoppingController.getProduct);

// Cart operations handled by CartItemsController
app.get('/cart', checkAuthenticated, CartItemsController.list);
app.post('/add-to-cart/:id', checkAuthenticated, CartItemsController.add);
app.post('/cart/increase', checkAuthenticated, CartItemsController.increase);
app.post('/cart/decrease', checkAuthenticated, CartItemsController.decrease);
app.post('/cart/remove', checkAuthenticated, CartItemsController.remove);
app.post('/cart/clear', checkAuthenticated, CartItemsController.clear);
app.post('/cart/checkout', checkAuthenticated, CartItemsController.checkout);

// Invoice routes
app.get('/invoices', checkAuthenticated, InvoiceController.listUserInvoices);
app.get('/all-invoices', checkAuthenticated, InvoiceController.listAllInvoices);
app.get('/invoice/:id', checkAuthenticated, InvoiceController.showInvoice);

// Feedback routes
app.get('/feedback', checkAuthenticated, FeedbackController.listAllProducts);
app.get('/feedback/product/:id', checkAuthenticated, (req, res) => {
  FeedbackController.getProductDetails(req, res);
});
app.get('/feedback/product/:id/submit', checkAuthenticated, (req, res) => {
  req.method = 'GET';
  FeedbackController.submitFeedback(req, res);
});
app.post('/feedback/product/:id', checkAuthenticated, (req, res) => {
  req.method = 'POST';
  FeedbackController.submitFeedback(req, res);
});
app.get('/feedback/edit/:feedbackId', checkAuthenticated, (req, res) => {
  req.method = 'GET';
  FeedbackController.editFeedback(req, res);
});
app.post('/feedback/edit/:feedbackId', checkAuthenticated, (req, res) => {
  req.method = 'POST';
  FeedbackController.editFeedback(req, res);
});
app.post('/feedback/delete/:feedbackId', checkAuthenticated, FeedbackController.deleteFeedback);

app.get('/logout', UserController.logoutUser);

// Product routes via ProductController
// Admin: open edit form
app.get(
  '/updateProduct/:id', checkAuthenticated, checkAuthorised(['admin']),
  (req, res) => {
    return ProductController.showEditForm(req, res);
  }
);

// View a single product
app.get('/product/:id', checkAuthenticated, (req, res, next) => {
  const user = req.session.user;

  // If admin clicked an edit link like /product/3?edit=true
  if (req.query.edit === 'true' && user && user.role === 'admin') {
    return ProductController.showEditForm(req, res);
  }

  // Normal shopper view
  return ShoppingController.getProduct(req, res, next);
});

// Show edit form (GET)
app.get(
  '/updateProduct/:id',
  checkAuthenticated,
  checkAuthorised(['admin']),
  (req, res) => {
    return ProductController.showEditForm(req, res);
  }
);

// Handle edit form submission (POST)
app.post(
  '/updateProduct/:id',
  checkAuthenticated,
  checkAuthorised(['admin']),
  upload.single('image'),
  ProductController.updateProduct
);

// Delete product route (GET)
app.get(
  '/deleteProduct/:id',
  checkAuthenticated,
  checkAuthorised(['admin']),
  ProductController.deleteProduct
);

// NETS QR route
app.get("/", (req, res) => { res.render("shopping") })
app.post('/generateNETSQR', netsQr.generateQrCode);
app.get("/nets-qr/success", (req, res) => {
    res.render('netsTxnSuccessStatus', { message: 'Transaction Successful!' });
});
app.get("/nets-qr/fail", (req, res) => {
    res.render('netsTxnFailStatus', { message: 'Transaction Failed. Please try again.' });
})

app.get('/addProduct', checkAuthenticated, checkAuthorised(['admin']), (req, res) => res.render('addProduct', { user: req.session.user }));
app.post('/addProduct', checkAuthenticated, checkAuthorised(['admin']), upload.single('image'), ProductController.addProduct);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

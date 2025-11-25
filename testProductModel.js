require('dotenv').config();
const Product = require('./models/Product');

console.log('Testing Product model...');

Product.getAllProducts((err, products) => {
  if (err) return console.error('getAllProducts error:', err);
  console.log('All products:', products);

  Product.getProductById(products[0].productId, (err, p) => {
    if (err) return console.error('getProductById error:', err);
    console.log('Product by id:', p);

    const newProduct = { productName: 'Test Item', quantity: 10, price: 2.5, image: 'test.png' };
    Product.addProduct(newProduct, (err, addRes) => {
      if (err) return console.error('addProduct error:', err);
      console.log('Added product id:', addRes.insertId);

      const updated = { productName: 'Test Item Updated', quantity: 20, price: 3.5, image: 'test2.png' };
      Product.updateProduct(addRes.insertId, updated, (err, updateRes) => {
        if (err) return console.error('updateProduct error:', err);
        console.log('Update result:', updateRes);

        Product.deleteProduct(addRes.insertId, (err, delRes) => {
          if (err) return console.error('deleteProduct error:', err);
          console.log('Delete result:', delRes);
          console.log('Product model test completed.');
          process.exit(0);
        });
      });
    });
  });
});
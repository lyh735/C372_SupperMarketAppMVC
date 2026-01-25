const axios = require('axios');
require('dotenv').config();

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

async function getAccessToken() {
  const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(PAYPAL_CLIENT + ':' + PAYPAL_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data.access_token;
}

async function createOrder(amount, returnUrl, cancelUrl) {
  const accessToken = await getAccessToken();
  const response = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'SGD', value: amount }
    }],
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data;
}

async function captureOrder(orderId) {
  const accessToken = await getAccessToken();
  const response = await axios.post(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {}, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const data = response.data;
  console.log('PayPal captureOrder response:', data);
  return data;
}

module.exports = { createOrder, captureOrder };
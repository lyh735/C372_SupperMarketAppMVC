// services/refundService.js
const axios = require('axios');
require('dotenv').config();

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

/**
 * Get PayPal access token
 */
async function getAccessToken() {
  try {
    const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(PAYPAL_CLIENT + ':' + PAYPAL_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.message);
    throw new Error('Failed to authenticate with PayPal');
  }
}

/**
 * Refund a PayPal transaction
 * @param {string} txnRef - PayPal transaction ID (sale ID)
 * @param {number} amount - Refund amount
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function refundPayPal(txnRef, amount) {
  try {
    if (!txnRef) {
      return {
        success: false,
        message: 'Invalid PayPal transaction reference'
      };
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
      return {
        success: false,
        message: 'Invalid refund amount'
      };
    }

    const accessToken = await getAccessToken();

    // PayPal v2 refunds use capture ID (not order ID)
    const response = await axios.post(
      `${PAYPAL_API}/v2/payments/captures/${txnRef}/refund`,
      {
        amount: {
          currency_code: 'SGD',
          value: numericAmount.toFixed(2)
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log('PayPal refund response:', response.data);

    return {
      success: true,
      message: 'PayPal refund processed successfully',
      refundId: response.data.id,
      state: response.data.state,
      rawResponse: response.data
    };
  } catch (error) {
    console.error('PayPal refund error:', error.message);
    
    // Extract PayPal API error message if available
    const errorMessage = error.response?.data?.details?.[0]?.issue || 
                         error.response?.data?.message || 
                         'PayPal refund failed';

    return {
      success: false,
      message: errorMessage
    };
  }
}

module.exports = {
  refundPayPal
};

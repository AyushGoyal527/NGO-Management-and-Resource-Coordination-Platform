const ApiError = require('../../utils/ApiError');
const manual = require('./manual');

// Placeholder for a future Stripe integration. It is NOT implemented: it never takes a payment.
// To finish it: create an order in createOrder(), then in verifyWebhook() check the signature and mark the matching
// inquiry as 'received' through donationService.create so a receipt is issued.
exports.name = 'stripe';
exports.isConfigured = () => false;
exports.describe = (donate) => manual.describe(donate); // until implemented, donors see the manual details
exports.createOrder = async () => { throw new ApiError(501, 'Online payment with Stripe is not set up yet'); };
exports.verifyWebhook = async () => { throw new ApiError(501, 'Online payment with Stripe is not set up yet'); };

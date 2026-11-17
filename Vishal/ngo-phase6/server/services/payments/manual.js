// Default provider: no online payment. The donor gets the bank/UPI details the admin entered in the CMS and pays outside the site.
// Staff then record the money as a normal donation, which issues the receipt.
exports.name = 'manual';
exports.isConfigured = () => true;
exports.describe = (donate = {}) => {
  const details = [
    donate.upiId && { label: 'UPI ID', value: donate.upiId },
    donate.bankName && { label: 'Bank', value: donate.bankName },
    donate.accountName && { label: 'Account name', value: donate.accountName },
    donate.accountNumber && { label: 'Account number', value: donate.accountNumber },
    donate.ifsc && { label: 'IFSC', value: donate.ifsc },
  ].filter(Boolean);
  return { provider: 'manual', online: false, details, instructions: donate.instructions || '' };
};
exports.createOrder = async () => null;
exports.verifyWebhook = async () => { throw new (require('../../utils/ApiError'))(404, 'Not found'); };

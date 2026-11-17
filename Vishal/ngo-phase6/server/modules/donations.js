const Donation = require('../models/Donation');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const { notifyByPermission } = require('../utils/notify');

// RCPT-2026-0001. The counter is atomic; the exists() check protects against numbers that came from an import.
async function nextReceiptNumber(date) {
  const year = new Date(date || Date.now()).getFullYear();
  for (let i = 0; i < 5; i += 1) {
    const seq = await Counter.next(`receipt-${year}`);
    const number = `RCPT-${year}-${String(seq).padStart(4, '0')}`;
    if (!(await Donation.exists({ receiptNumber: number }))) return number;
  }
  throw new ApiError(500, 'Could not create a receipt number. Please try again');
}

module.exports = {
  module: 'donations', label: 'Donation', model: Donation, hasDocuments: true, scoped: false, nameField: 'donorName', dateField: 'donationDate',
  searchFields: ['donorName', 'email', 'phone', 'receiptNumber', 'transactionId', 'campaign'],
  sortable: ['donorName', 'amount', 'donationDate', 'status', 'createdAt'],
  filters: { type: 'donationType', status: 'status', method: 'paymentMethod', campaign: 'campaign', donorType: 'donorType' },
  populate: [{ path: 'documents', select: 'originalName mimeType size createdAt' }],
  fields: ['donorName', 'donorType', 'email', 'phone', 'amount', 'donationType', 'paymentMethod', 'transactionId', 'donationDate',
    'campaign', 'purpose', 'status', 'notes'],

  async beforeSave(data, { existing }) {
    const now = { ...(existing ? existing.toObject() : {}), ...data };
    const status = now.status || 'received';
    const type = now.donationType || 'money';
    if (type === 'money' && ['received', 'pending'].includes(status) && !(Number(now.amount) > 0)) {
      throw new ApiError(400, 'Enter the donation amount');
    }
    if (status === 'received' && !now.receiptNumber) data.receiptNumber = await nextReceiptNumber(now.donationDate);
  },

  // Tell the people who look after donations when one is received (new, or just marked received).
  async afterSave(donation, { user, isCreate, before }) {
    if (donation.status !== 'received' || (!isCreate && before?.status === 'received')) return;
    const who = donation.donorType === 'anonymous' ? 'an anonymous donor' : donation.donorName;
    const what = donation.donationType === 'money' && donation.amount ? `Rs. ${Number(donation.amount).toLocaleString('en-IN')}` : `an in-kind donation`;
    await notifyByPermission('donations.view', { type: 'donation-received', title: `Donation received: ${what}`, message: `From ${who}${donation.receiptNumber ? ` (${donation.receiptNumber})` : ''}`, path: '/donations' }, user._id);
  },
};

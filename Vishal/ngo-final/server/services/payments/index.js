// Picks the payment provider from PAYMENT_PROVIDER (manual | razorpay | stripe). Anything else, or a provider that is not ready, falls back to manual.
const providers = { manual: require('./manual'), razorpay: require('./razorpay'), stripe: require('./stripe') };

exports.get = () => {
  const wanted = (process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();
  const p = providers[wanted];
  if (p && p.isConfigured()) return p;
  if (wanted !== 'manual') console.warn(`PAYMENT_PROVIDER "${wanted}" is not available; using manual payment details`);
  return providers.manual;
};

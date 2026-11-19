const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
const three = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', n % 100 ? two(n % 100) : ''].filter(Boolean).join(' ');

// Indian numbering: thousand, lakh, crore.
function words(n) {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  return [crore && `${words(crore)} Crore`, lakh && `${two(lakh)} Lakh`, thousand && `${two(thousand)} Thousand`, rest && three(rest)].filter(Boolean).join(' ');
}

exports.amountInWords = (amount) => {
  const total = Math.round(Number(amount) * 100);
  const rupees = Math.floor(total / 100);
  const paise = total % 100;
  return `Rupees ${words(rupees)}${paise ? ` and Paise ${two(paise)}` : ''} Only`;
};

exports.formatINR = (amount) => `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount) || 0)}`;

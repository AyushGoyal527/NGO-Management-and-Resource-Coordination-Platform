export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const inrExact = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
export const num = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(n || 0);
export const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// Today's date in the person's own time zone, as yyyy-mm-dd. toISOString() would give the UTC date,
// which is "yesterday" for the first 5.5 hours of the day in India.
export const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const label = (v) => String(v ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const options = (values) => values.map((v) => ({ value: v, label: label(v) }));

const ApiError = require('../utils/ApiError');

// One definition of every editable part of the public website. The admin CMS screen is built from this
// (served by GET /api/website), and the same definition checks what is saved, so the two can never disagree.
const STAT_SOURCES = [
  { value: 'volunteers', label: 'Active volunteers (counted automatically)' }, { value: 'beneficiaries', label: 'Beneficiaries supported (counted automatically)' },
  { value: 'students', label: 'Students (counted automatically)' }, { value: 'programs', label: 'Programs (counted automatically)' },
  { value: 'events', label: 'Events held (counted automatically)' }, { value: 'peopleServed', label: 'People served with food (counted automatically)' },
  { value: 'manual', label: 'A number I type in' },
];
const text = (key, label, max, extra = {}) => ({ key, label, type: 'text', max, ...extra });
const area = (key, label, max, extra = {}) => ({ key, label, type: 'textarea', max, ...extra });

exports.ORG_FIELDS = [
  text('name', 'Organisation name', 100, { required: true }), text('tagline', 'Tagline', 150), text('registrationNumber', 'Registration number', 50),
  { key: 'email', label: 'Public email', type: 'email', max: 120 }, text('phone', 'Public phone', 25), text('address', 'Address', 300),
  { key: 'website', label: 'Website address', type: 'url', max: 200 }, { key: 'logo', label: 'Logo', type: 'image' },
  { key: 'socialLinks', label: 'Social links', type: 'group', fields: [
    { key: 'facebook', label: 'Facebook', type: 'url', max: 200 }, { key: 'instagram', label: 'Instagram', type: 'url', max: 200 },
    { key: 'twitter', label: 'X (Twitter)', type: 'url', max: 200 }, { key: 'youtube', label: 'YouTube', type: 'url', max: 200 },
  ] },
];

exports.SECTIONS = {
  hero: { label: 'Hero', help: 'The first thing visitors see on the home page.', fields: [
    text('title', 'Headline', 120, { required: true }), area('description', 'Description', 500),
    { key: 'images', label: 'Hero images (up to 5)', type: 'images', max: 5 },
  ] },
  about: { label: 'About', help: 'Shown on the home page and the About page.', fields: [text('title', 'Heading', 100), area('text', 'About the organisation', 3000), { key: 'image', label: 'Photo', type: 'image' }] },
  mission: { label: 'Mission', fields: [area('text', 'Mission', 1000), area('vision', 'Vision (optional)', 1000)] },
  stats: { label: 'Impact numbers', help: 'Counted from your real records, or typed in by hand. Up to 6.', fields: [
    { key: 'items', label: 'Numbers', type: 'list', max: 6, item: [text('label', 'Label', 40, { required: true }), { key: 'source', label: 'Where the number comes from', type: 'select', options: STAT_SOURCES, required: true },
      { key: 'value', label: 'Number', type: 'number', min: 0, max: 1000000000, showWhen: { key: 'source', equals: 'manual' } }] },
  ] },
  stories: { label: 'Success stories', fields: [{ key: 'items', label: 'Stories', type: 'list', max: 9, item: [text('title', 'Title', 100, { required: true }), area('text', 'Story', 800, { required: true }), { key: 'image', label: 'Photo', type: 'image' }] }] },
  testimonials: { label: 'Testimonials', fields: [{ key: 'items', label: 'Testimonials', type: 'list', max: 12, item: [text('name', 'Name', 80, { required: true }), text('role', 'Role (for example Volunteer)', 80), area('quote', 'What they said', 500, { required: true }), { key: 'image', label: 'Photo', type: 'image' }] }] },
  cta: { label: 'Calls to action', help: 'The donate and volunteer boxes on the home page.', fields: [text('donateTitle', 'Donate heading', 100), area('donateText', 'Donate text', 300), text('volunteerTitle', 'Volunteer heading', 100), area('volunteerText', 'Volunteer text', 300)] },
  donate: { label: 'Donation details', help: 'Shown on the Donate page after someone sends an inquiry. Everything here is public.', fields: [
    area('intro', 'Introduction', 800), text('upiId', 'UPI ID', 80), text('bankName', 'Bank name', 100), text('accountName', 'Account name', 100),
    text('accountNumber', 'Account number', 30), text('ifsc', 'IFSC code', 20), area('instructions', 'Instructions for donors', 600),
  ] },
  contact: { label: 'Contact page', help: 'Address, phone and email come from the Organisation tab.', fields: [area('text', 'Message', 600), text('hours', 'Opening hours', 120), { key: 'mapUrl', label: 'Map link (Google Maps)', type: 'url', max: 500 }] },
};
exports.SECTION_KEYS = Object.keys(exports.SECTIONS);

const fail = (label, msg) => { throw new ApiError(400, `${label}: ${msg}`); };
const IMAGE_OWN = /^\/uploads\/site\/[a-f0-9]{32}\.(jpg|png|webp)$/;
const isHttps = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a cleaned copy containing only known fields, trimmed, within limits. Throws a 400 naming the field on the first problem.
function cleanFields(fields, input, path = '') {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  fields.forEach((f) => {
    const label = path ? `${path} > ${f.label}` : f.label;
    let v = src[f.key];
    if (v === undefined || v === null || v === '') {
      if (f.required && !(f.showWhen && src[f.showWhen.key] !== f.showWhen.equals)) fail(label, 'is required');
      return;
    }
    switch (f.type) {
      case 'text': case 'textarea': case 'email': case 'url': {
        if (typeof v !== 'string') fail(label, 'must be text');
        v = v.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        if (!v) { if (f.required) fail(label, 'is required'); return; }
        if (v.length > f.max) fail(label, `must be at most ${f.max} characters`);
        if (f.type === 'email' && !EMAIL.test(v)) fail(label, 'must be a valid email address');
        if (f.type === 'url' && !isHttps(v)) fail(label, 'must be a full web address starting with https://');
        out[f.key] = v;
        break;
      }
      case 'image':
        if (typeof v !== 'string' || !(IMAGE_OWN.test(v) || (v.length <= 500 && isHttps(v)))) fail(label, 'must be an uploaded image or an https:// image address');
        out[f.key] = v;
        break;
      case 'images': {
        if (!Array.isArray(v) || v.length > f.max) fail(label, `can have at most ${f.max} images`);
        out[f.key] = v.map((x) => {
          const item = cleanFields([{ key: 'url', label: 'Image', type: 'image', required: true }, { key: 'alt', label: 'Description of the image', type: 'text', max: 150 }], x, label);
          return item;
        });
        break;
      }
      case 'select':
        if (!f.options.some((o) => o.value === v)) fail(label, 'is not a valid choice');
        out[f.key] = v;
        break;
      case 'number':
        if (typeof v === 'string' && v.trim() !== '') v = Number(v);
        if (typeof v !== 'number' || !Number.isFinite(v) || v < f.min || v > f.max) fail(label, `must be a number from ${f.min} to ${f.max}`);
        out[f.key] = v;
        break;
      case 'group': {
        const inner = cleanFields(f.fields, v, label);
        if (Object.keys(inner).length) out[f.key] = inner;
        break;
      }
      case 'list': {
        if (!Array.isArray(v) || v.length > f.max) fail(label, `can have at most ${f.max} entries`);
        out[f.key] = v.map((x, i) => {
          const cleaned = cleanFields(f.item.map((it) => it), x, `${label} #${i + 1}`);
          if (f.item.some((it) => it.type === 'select' && it.key === 'source') && cleaned.source !== 'manual') delete cleaned.value;
          if (cleaned.source === 'manual' && cleaned.value === undefined) fail(`${label} #${i + 1}`, 'Number is required when you type the number in');
          return cleaned;
        });
        break;
      }
      default: break;
    }
  });
  return out;
}
exports.cleanFields = cleanFields;
exports.cleanSection = (key, content) => cleanFields(exports.SECTIONS[key].fields, content, exports.SECTIONS[key].label);
exports.cleanOrganization = (input) => cleanFields(exports.ORG_FIELDS, input, 'Organisation');

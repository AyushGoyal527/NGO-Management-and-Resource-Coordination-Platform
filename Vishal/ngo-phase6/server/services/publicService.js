const Organization = require('../models/Organization');
const WebsiteContent = require('../models/WebsiteContent');
const Program = require('../models/Program');
const Event = require('../models/Event');
const Volunteer = require('../models/Volunteer');
const Student = require('../models/Student');
const Beneficiary = require('../models/Beneficiary');
const FoodDistribution = require('../models/FoodDistribution');
const Donation = require('../models/Donation');
const payments = require('./payments');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { notifyRoles, notifyByPermission } = require('../utils/notify');
const { SECTION_KEYS } = require('../config/websiteSchema');

// Everything here is public. Each query picks the fields it returns; nothing is passed through whole.
const hasContent = (c) => c && typeof c === 'object' && Object.values(c).some((v) => (Array.isArray(v) ? v.length : v && (typeof v !== 'object' || Object.keys(v).length)));

const statCounters = {
  volunteers: () => Volunteer.countDocuments({ status: 'active' }),
  beneficiaries: () => Beneficiary.countDocuments({ status: 'active' }),
  students: () => Student.countDocuments({ status: 'active' }),
  programs: () => Program.countDocuments({ showOnWebsite: { $ne: false }, status: { $in: ['active', 'planned', 'completed'] } }),
  events: () => Event.countDocuments({ isPublic: true, status: 'completed' }),
  peopleServed: () => FoodDistribution.aggregate([{ $group: { _id: null, n: { $sum: '$numberOfBeneficiaries' } } }]).then((r) => r[0]?.n || 0),
};

async function resolveStats(content) {
  const items = content?.items || [];
  const sources = [...new Set(items.map((i) => i.source).filter((s) => statCounters[s]))];
  const counts = Object.fromEntries(await Promise.all(sources.map(async (s) => [s, await statCounters[s]()])));
  return { items: items.map((i) => ({ label: i.label, value: i.source === 'manual' ? i.value : counts[i.source] ?? 0 })) };
}

exports.site = async () => {
  const [org, rows] = await Promise.all([
    Organization.findOne().select('name tagline registrationNumber email phone address website logo socialLinks -_id').lean(),
    WebsiteContent.find({ section: { $in: SECTION_KEYS } }).select('section content -_id').lean(),
  ]);
  const sections = {};
  rows.forEach((r) => { if (SECTION_KEYS.includes(r.section) && hasContent(r.content)) sections[r.section] = r.content; });
  if (sections.stats) sections.stats = await resolveStats(sections.stats);
  if (sections.stats && !sections.stats.items.length) delete sections.stats;
  const donate = sections.donate || {};
  // Bank/UPI details are only returned through the donation flow, not on every page load.
  delete sections.donate;
  return { organization: org || {}, sections, donateEnabled: true, donateIntro: donate.intro || '' };
};

const programFields = 'name description type startDate endDate location status';
exports.programs = () =>
  Program.find({ showOnWebsite: { $ne: false }, status: { $in: ['active', 'planned', 'completed'] } }).select(`${programFields} -_id`).sort({ status: 1, startDate: -1 }).limit(60).lean();

exports.events = async ({ when = 'upcoming', page = 1, limit = 12 }) => {
  const p = Math.max(parseInt(page, 10) || 1, 1); const l = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const upcoming = when !== 'past';
  const filter = { isPublic: true, status: { $ne: 'cancelled' }, date: upcoming ? { $gte: today } : { $lt: today } };
  const [items, total] = await Promise.all([
    Event.find(filter).select('name description date startTime endTime location programType -_id').sort({ date: upcoming ? 1 : -1 }).skip((p - 1) * l).limit(l).lean(),
    Event.countDocuments(filter),
  ]);
  return { items, total, page: p, pages: Math.max(Math.ceil(total / l), 1) };
};

exports.applyAsVolunteer = async (b, ip) => {
  if (b.website) return { ok: true }; // honeypot filled in: pretend it worked, store nothing
  const email = b.email.toLowerCase();
  const exists = await Volunteer.exists({ email });
  if (exists) return { ok: true }; // same answer either way, so the form cannot be used to find out who is registered
  const v = await Volunteer.create({
    name: b.name, email, phone: b.phone || undefined, skills: b.skills || [], availability: b.availability || undefined,
    notes: b.message ? `Message from applicant: ${b.message}` : undefined, status: 'pending', source: 'website',
  });
  await logActivity({ action: 'Volunteer application received from website', module: 'volunteers', recordId: v._id, newValue: { name: v.name, source: 'website' } });
  await notifyRoles(['admin'], { type: 'volunteer-application', title: 'New volunteer application', message: `${v.name} applied through the website` });
  return { ok: true };
};

exports.donationInquiry = async (b) => {
  const money = b.donationType === 'money';
  if (!b.email && !b.phone) throw new ApiError(400, 'Please give an email or phone number so we can reach you');
  if (money && !(b.amount > 0)) throw new ApiError(400, 'Please enter the amount you plan to give');
  const d = await Donation.create({
    donorName: b.anonymous ? 'Anonymous' : b.name, donorType: b.anonymous ? 'anonymous' : 'individual',
    email: b.email || undefined, phone: b.phone || undefined, donationType: b.donationType,
    amount: money ? b.amount : 0, purpose: b.purpose || undefined, status: 'inquiry',
    notes: [b.anonymous ? `Contact name: ${b.name}` : '', b.message].filter(Boolean).join('\n') || undefined,
  });
  await logActivity({ action: 'Donation inquiry received from website', module: 'donations', recordId: d._id, newValue: { donationType: d.donationType, amount: d.amount } });
  await notifyByPermission('donations.view', { path: '/donations', type: 'donation-inquiry', title: 'New donation inquiry', message: `${b.anonymous ? 'Someone' : b.name} wants to give${money ? ` ₹${b.amount}` : ` (${b.donationType})`}` });
  const donate = (await WebsiteContent.findOne({ section: 'donate' }).select('content -_id').lean())?.content || {};
  return { reference: String(d._id).slice(-8).toUpperCase(), payment: money ? payments.get().describe(donate) : null };
};

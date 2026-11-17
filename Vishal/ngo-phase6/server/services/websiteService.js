const fs = require('fs');
const path = require('path');
const Organization = require('../models/Organization');
const WebsiteContent = require('../models/WebsiteContent');
const schema = require('../config/websiteSchema');
const { logActivity } = require('../utils/activityLogger');

const siteDir = () => path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'site');

exports.get = async () => {
  const [org, rows] = await Promise.all([Organization.findOne().lean(), WebsiteContent.find().select('section content').lean()]);
  const sections = Object.fromEntries(schema.SECTION_KEYS.map((k) => [k, rows.find((r) => r.section === k)?.content || {}]));
  return { organization: org || {}, sections, schema: { organization: schema.ORG_FIELDS, sections: schema.SECTIONS, order: schema.SECTION_KEYS } };
};

exports.saveSection = async (key, body, userId) => {
  const content = schema.cleanSection(key, body);
  const before = await WebsiteContent.findOne({ section: key }).select('content').lean();
  await WebsiteContent.findOneAndUpdate({ section: key }, { content, updatedBy: userId }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await logActivity({ user: userId, action: `Updated website section: ${schema.SECTIONS[key].label}`, module: 'website', previousValue: before?.content, newValue: content });
  exports.pruneImages().catch(() => {});
  return content;
};

exports.saveOrganization = async (body, userId) => {
  const data = schema.cleanOrganization(body);
  const org = await Organization.findOne();
  const before = org?.toObject();
  const saved = org ? Object.assign(org, { socialLinks: {}, ...data }) : new Organization(data);
  await saved.save();
  await logActivity({ user: userId, action: 'Updated website organisation details', module: 'website', previousValue: before, newValue: data });
  exports.pruneImages().catch(() => {});
  return saved.toObject();
};

// Deletes uploaded site images that nothing refers to any more. Files younger than an hour are kept so an image
// that was just uploaded but not saved yet is not removed.
exports.pruneImages = async () => {
  const dir = siteDir();
  if (!fs.existsSync(dir)) return 0;
  const [org, rows] = await Promise.all([Organization.findOne().lean(), WebsiteContent.find().lean()]);
  const used = JSON.stringify([org, rows]);
  let removed = 0;
  for (const f of await fs.promises.readdir(dir)) {
    const stat = await fs.promises.stat(path.join(dir, f)).catch(() => null);
    if (!stat || Date.now() - stat.mtimeMs < 3600 * 1000 || used.includes(`/uploads/site/${f}`)) continue;
    await fs.promises.unlink(path.join(dir, f)).catch(() => {}); removed += 1;
  }
  return removed;
};

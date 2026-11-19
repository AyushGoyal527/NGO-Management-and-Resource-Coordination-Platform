const ApiError = require('../utils/ApiError');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../utils/activityLogger');
const documents = require('./documentService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// '' and null become undefined, so a cleared form field unsets the value instead of failing enum/number casts.
function clean(value) {
  if (value === '' || value === null) return undefined;
  if (Array.isArray(value)) return value.filter((v) => v !== '' && v !== null);
  if (isPlainObject(value)) {
    const out = {};
    Object.keys(value).forEach((k) => { out[k] = clean(value[k]); });
    return Object.values(out).every((v) => v === undefined) ? undefined : out;
  }
  return value;
}

// Builds list/get/create/update/remove/history/uploads for any module described by a config object.
module.exports = function createCrudService(cfg) {
  const {
    module, label, model, searchFields = [], sortable = ['createdAt'], filters = {}, dateField = 'createdAt',
    populate = [], archive = false, fields, photoField, beforeSave, extraFilter,
    scoped = true, nameField = 'name', hasDocuments = false,
    scopeFilter, stamp, afterSave, beforeRemove,
  } = cfg;

  // Admins see everything. Everyone else only sees records assigned to them (and records they create).
  // A module can replace this with its own rule (tasks: created by / assigned to me; events: managed by / assigned to me).
  const scope = scopeFilter || ((user) => (!scoped || user.role === 'admin' ? {} : { assignedManager: user._id }));
  const populateAll = (q) => populate.reduce((query, p) => query.populate(p), q);

  async function findInScope(user, id, withPopulate = false) {
    const q = model.findOne({ _id: id, ...scope(user) });
    const doc = await (withPopulate ? populateAll(q) : q);
    if (!doc) throw new ApiError(404, `${label} not found`);
    return doc;
  }

  const pick = (body) => Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, clean(body[f])]));

  // Shared by the list screen and by exports, so a CSV always matches what the person was looking at.
  function buildFilter(query, user) {
    const filter = {};
    if (query.search) {
      const rx = new RegExp(escapeRegex(String(query.search).slice(0, 60)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    Object.entries(filters).forEach(([param, field]) => {
      if (typeof query[param] === 'string' && query[param]) filter[field] = query[param];
    });
    if (archive && !filter.status) filter.status = { $ne: 'archived' };

    const range = {};
    if (query.from && !Number.isNaN(Date.parse(query.from))) range.$gte = new Date(query.from);
    if (query.to && !Number.isNaN(Date.parse(query.to))) range.$lte = new Date(new Date(query.to).getTime() + 24 * 60 * 60 * 1000 - 1);
    if (Object.keys(range).length) filter[dateField] = range;

    const extra = extraFilter && extraFilter(query);
    const out = extra ? { $and: [filter, extra] } : filter;
    // Scope goes in its own $and slot, last, so a query string can never widen it (and it can use $or without clashing with search).
    const limit = scope(user);
    return Object.keys(limit).length ? { $and: [out, limit] } : out;
  }

  async function list(query, user) {
    const filter = buildFilter(query, user);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const sortBy = sortable.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const order = query.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      populateAll(model.find(filter).sort({ [sortBy]: order, _id: 1 }).skip((page - 1) * limit).limit(limit)),
      model.countDocuments(filter),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
  }

  const get = (user, id) => findInScope(user, id, true);

  async function create(user, body) {
    const data = pick(body);
    if (scoped && user.role !== 'admin') data.assignedManager = user._id;
    if (stamp) stamp(data, user);
    if (beforeSave) await beforeSave(data, { user, isCreate: true });
    const doc = await model.create(data);
    await logActivity({ user: user._id, action: 'create', module, recordId: doc._id, newValue: data });
    if (afterSave) await afterSave(doc, { user, isCreate: true });
    return get(user, doc._id);
  }

  async function update(user, id, body) {
    const doc = await findInScope(user, id);
    const data = pick(body);
    if (scoped && user.role !== 'admin') delete data.assignedManager;
    if (beforeSave) await beforeSave(data, { user, isCreate: false, existing: doc });

    const previousValue = {}; const newValue = {};
    const before = doc.toObject();
    Object.keys(data).forEach((k) => {
      if (JSON.stringify(before[k]) !== JSON.stringify(data[k])) { previousValue[k] = before[k]; newValue[k] = data[k]; }
      doc.set(k, data[k]);
    });
    await doc.save();
    if (Object.keys(newValue).length) await logActivity({ user: user._id, action: 'update', module, recordId: doc._id, previousValue, newValue });
    if (afterSave) await afterSave(doc, { user, isCreate: false, before });
    return get(user, id);
  }

  async function remove(user, id) {
    const doc = await findInScope(user, id);
    if (beforeRemove) await beforeRemove(doc, { user });
    if (archive) {
      doc.status = 'archived';
      await doc.save();
      await logActivity({ user: user._id, action: 'archive', module, recordId: doc._id, previousValue: { status: 'active' }, newValue: { status: 'archived' } });
      return { archived: true };
    }
    if (hasDocuments) await documents.removeAllFor(doc);
    await doc.deleteOne();
    await logActivity({ user: user._id, action: 'delete', module, recordId: doc._id, previousValue: { name: doc[nameField] } });
    return { archived: false };
  }

  async function history(user, id) {
    await findInScope(user, id);
    return ActivityLog.find({ module, recordId: id }).sort({ timestamp: -1 }).limit(50).populate('user', 'name').lean();
  }

  async function setPhoto(user, id, file) {
    const doc = await findInScope(user, id);
    await documents.setPhoto(doc, photoField, file);
    await logActivity({ user: user._id, action: 'update-photo', module, recordId: doc._id });
    return get(user, id);
  }

  async function addDocuments(user, id, files) {
    const doc = await findInScope(user, id);
    await documents.attach(user, module, doc, files);
    await logActivity({ user: user._id, action: 'upload-documents', module, recordId: doc._id, newValue: { files: files.map((f) => f.originalname) } });
    return get(user, id);
  }

  async function removeDocument(user, id, docId) {
    const doc = await findInScope(user, id);
    await documents.detach(doc, docId);
    await logActivity({ user: user._id, action: 'delete-document', module, recordId: doc._id });
    return get(user, id);
  }

  return { cfg, scope, buildFilter, findInScope, list, get, create, update, remove, history, setPhoto, addDocuments, removeDocument };
};

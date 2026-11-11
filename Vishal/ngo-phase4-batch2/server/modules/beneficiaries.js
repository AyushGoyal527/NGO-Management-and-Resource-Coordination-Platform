const Beneficiary = require('../models/Beneficiary');

module.exports = {
  module: 'beneficiaries', hasDocuments: true, label: 'Beneficiary', model: Beneficiary, photoField: 'photo', archive: true,
  searchFields: ['name', 'contact', 'address'],
  sortable: ['name', 'age', 'familySize', 'createdAt'],
  filters: { status: 'status', manager: 'assignedManager', program: 'assignedProgram', economicCategory: 'economicCategory' },
  populate: [{ path: 'assignedManager', select: 'name' }, { path: 'assignedProgram', select: 'name' }, { path: 'documents', select: 'originalName mimeType size createdAt' }],
  fields: ['name', 'age', 'gender', 'contact', 'address', 'familySize', 'economicCategory', 'assistanceRequired',
    'assignedProgram', 'assignedManager', 'status', 'notes'],
};

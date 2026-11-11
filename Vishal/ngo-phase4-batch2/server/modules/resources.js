const Resource = require('../models/Resource');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

module.exports = {
  module: 'resources', label: 'Resource', model: Resource, scoped: false, dateField: 'purchaseOrDonationDate',
  searchFields: ['name', 'location', 'category'],
  sortable: ['name', 'category', 'quantity', 'value', 'status', 'purchaseOrDonationDate', 'createdAt'],
  filters: { category: 'category', status: 'status', condition: 'condition', person: 'assignedPerson' },
  populate: [{ path: 'assignedPerson', select: 'name role' }],
  fields: ['name', 'category', 'quantity', 'condition', 'location', 'assignedPerson', 'purchaseOrDonationDate', 'value', 'status', 'notes'],
  async beforeSave(data, { existing }) {
    const person = 'assignedPerson' in data ? data.assignedPerson : existing?.assignedPerson;
    const status = data.status || existing?.status;
    if (status === 'assigned' && !person) throw new ApiError(400, 'Choose who this resource is assigned to');
    if (data.assignedPerson && !(await User.exists({ _id: data.assignedPerson, status: 'active' }))) {
      throw new ApiError(400, 'The selected person was not found');
    }
  },
};

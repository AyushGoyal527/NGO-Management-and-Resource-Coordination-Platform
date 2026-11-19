const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

module.exports = {
  module: 'volunteers', hasDocuments: true, label: 'Volunteer', model: Volunteer, photoField: 'profilePhoto', dateField: 'joiningDate',
  searchFields: ['name', 'email', 'phone', 'skills'],
  sortable: ['name', 'status', 'volunteerHours', 'joiningDate', 'createdAt'],
  filters: { status: 'status', manager: 'assignedManager', gender: 'gender' },
  populate: [{ path: 'assignedManager', select: 'name' }, { path: 'documents', select: 'originalName mimeType size createdAt' }],
  fields: ['name', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'skills', 'availability', 'joiningDate',
    'emergencyContact', 'assignedManager', 'status', 'volunteerHours', 'notes'],
  // Link the profile to the login account with the same email, so hours and tasks show up on that volunteer's dashboard.
  async beforeSave(data, { isCreate }) {
    if (isCreate && data.email) {
      const account = await User.findOne({ email: data.email, role: 'volunteer' }).select('_id');
      if (account) data.user = account._id;
    }
  },
};

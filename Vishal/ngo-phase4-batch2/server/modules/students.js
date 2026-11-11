const Student = require('../models/Student');

module.exports = {
  module: 'students', hasDocuments: true, label: 'Student', model: Student, photoField: 'photo', archive: true,
  searchFields: ['name', 'school', 'contact', 'class'],
  sortable: ['name', 'class', 'educationProgress', 'createdAt'],
  filters: { status: 'status', manager: 'assignedManager', program: 'program', class: 'class', educationStatus: 'educationStatus' },
  populate: [{ path: 'assignedManager', select: 'name' }, { path: 'program', select: 'name' }, { path: 'documents', select: 'originalName mimeType size createdAt' }],
  fields: ['name', 'age', 'dateOfBirth', 'gender', 'school', 'class', 'parentGuardian', 'contact', 'address',
    'educationStatus', 'educationProgress', 'program', 'assignedManager', 'status', 'notes'],
};

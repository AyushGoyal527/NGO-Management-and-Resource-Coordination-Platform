// Registry of module configs, used by the document download route to find the owning record.
module.exports = {
  volunteers: require('./volunteers'),
  students: require('./students'),
  beneficiaries: require('./beneficiaries'),
  donations: require('./donations'),
  resources: require('./resources'),
  tasks: require('./tasks'),
  events: require('./events'),
};

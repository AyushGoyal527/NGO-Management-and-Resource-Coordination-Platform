// Development seed. Wipes the NGO collections and recreates realistic, linked demo data.
// Usage: npm run seed   (refuses to run in production unless you pass --force)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { MODULES, ALL_PERMISSIONS, defaultPermissionsFor } = require('./config/permissions');
const M = {};
['User', 'Volunteer', 'Student', 'Beneficiary', 'Donation', 'FoodInventory', 'FoodDistribution', 'Resource', 'Task',
  'Event', 'Program', 'Notification', 'ActivityLog', 'Document', 'Permission', 'Organization', 'WebsiteContent']
  .forEach((n) => { M[n] = require(`./models/${n}`); });

const PASSWORD = 'Password@123';
const day = 24 * 60 * 60 * 1000;
const ago = (d) => new Date(Date.now() - d * day);
const ahead = (d) => new Date(Date.now() + d * day);
const pick = (arr, i) => arr[i % arr.length];

async function run() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed in production without --force');
  }
  await connectDB();
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));

  // Permission catalog
  await M.Permission.insertMany(ALL_PERMISSIONS.map((key) => {
    const [module, action] = key.split('.');
    return { key, module, action, description: `${action} ${module}` };
  }));

  // Users (create() so passwords are hashed by the model hook)
  const admin = await M.User.create({ name: 'Anita Sharma', email: 'admin@ngo.org', password: PASSWORD, role: 'admin', status: 'active', phone: '9810000001', lastLogin: ago(0) });
  const managerA = await M.User.create({
    name: 'Meera Kapoor', email: 'meera.manager@ngo.org', password: PASSWORD, role: 'manager', status: 'active', phone: '9810000002',
    permissions: ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'volunteers.view', 'volunteers.edit', 'food.view', 'food.create', 'food.edit', 'food.distribute', 'events.view', 'events.create', 'events.edit'],
    dashboardModules: ['tasks', 'volunteers', 'food', 'events'],
  });
  const managerB = await M.User.create({
    name: 'Rahul Verma', email: 'rahul.manager@ngo.org', password: PASSWORD, role: 'manager', status: 'active', phone: '9810000003',
    permissions: ['students.view', 'students.create', 'students.edit', 'beneficiaries.view', 'beneficiaries.create', 'beneficiaries.edit', 'tasks.view', 'tasks.create', 'tasks.edit'],
    dashboardModules: ['students', 'beneficiaries', 'tasks'],
  });
  const volNames = ['Priya Nair', 'Arjun Mehta', 'Sneha Iyer', 'Karan Singh', 'Divya Rao'];
  const volUsers = [];
  for (let i = 0; i < volNames.length; i += 1) {
    volUsers.push(await M.User.create({
      name: volNames[i], email: `volunteer${i + 1}@ngo.org`, password: PASSWORD, role: 'volunteer',
      status: i === 4 ? 'pending' : 'active', phone: `98100001${i}0`, permissions: defaultPermissionsFor('volunteer'),
    }));
  }
  const managers = [managerA, managerB];

  // Programs
  const [foodDrive, eduCamp, medCamp] = await M.Program.insertMany([
    { name: 'Food Distribution Drive', type: 'food-distribution', description: 'Weekly hot meals and dry ration kits for families in nearby settlements.', startDate: ago(120), location: 'Sector 14 Community Hall', budget: 250000, manager: managerA._id, status: 'active' },
    { name: 'Education Camp', type: 'education', description: 'After-school tutoring and learning materials for children from Class 3 to 10.', startDate: ago(200), location: 'Government School Ground', budget: 180000, manager: managerB._id, status: 'active' },
    { name: 'Medical Camp', type: 'medical', description: 'Monthly free health check-ups and medicines.', startDate: ago(60), location: 'Primary Health Centre', budget: 120000, manager: managerB._id, status: 'planned' },
  ]);

  // Volunteer profiles linked to users
  await M.Volunteer.insertMany(volUsers.map((u, i) => ({
    user: u._id, name: u.name, email: u.email, phone: u.phone, address: `House ${10 + i}, Sector ${5 + i}, Gurugram`,
    gender: i % 2 ? 'male' : 'female', skills: pick([['teaching', 'english'], ['cooking', 'logistics'], ['first aid'], ['driving', 'logistics'], ['design', 'social media']], i),
    availability: pick(['Weekends', 'Weekday evenings', 'Flexible'], i), joiningDate: ago(30 + i * 40),
    emergencyContact: { name: 'Family contact', phone: `99000000${i}0`, relation: 'Parent' },
    assignedManager: pick(managers, i)._id, status: u.status === 'pending' ? 'pending' : 'active', volunteerHours: [42, 65, 18, 90, 0][i],
  })));

  // Students
  const studentNames = ['Aarav Kumar', 'Isha Gupta', 'Rohan Yadav', 'Ananya Das', 'Vivek Chauhan', 'Pooja Rani', 'Imran Khan', 'Simran Kaur', 'Deepak Meena', 'Kavya Joshi'];
  await M.Student.insertMany(studentNames.map((n, i) => ({
    name: n, age: 8 + (i % 7), gender: i % 2 ? 'male' : 'female', school: pick(['Govt. Primary School', 'Govt. Senior Secondary School'], i), class: String(3 + (i % 8)),
    parentGuardian: { name: `Guardian of ${n.split(' ')[0]}`, relation: i % 2 ? 'Father' : 'Mother', phone: `97000000${i}0` },
    contact: `97000000${i}0`, address: `Ward ${i + 1}, Sohna Road`, educationStatus: 'enrolled', educationProgress: 40 + i * 5,
    program: eduCamp._id, assignedManager: managerB._id,
    attendance: [1, 2, 3, 4, 5].map((d) => ({ date: ago(d), present: (i + d) % 5 !== 0 })),
  })));

  // Beneficiaries
  const benNames = ['Sunita Devi', 'Mohan Lal', 'Lakshmi Bai', 'Ramesh Prasad', 'Fatima Begum', 'Gopal Singh', 'Rekha Kumari', 'Suresh Pal', 'Meena Devi', 'Ibrahim Ali'];
  await M.Beneficiary.insertMany(benNames.map((n, i) => ({
    name: n, age: 30 + i * 4, gender: i % 2 ? 'male' : 'female', contact: `96000000${i}0`, address: `Jhuggi Cluster ${i + 1}, Gurugram`,
    familySize: 3 + (i % 5), economicCategory: pick(['below-poverty-line', 'low-income'], i), assistanceRequired: pick([['food'], ['food', 'medicine'], ['education support']], i),
    assistanceProvided: [{ type: 'Ration kit', date: ago(10 + i), notes: 'Monthly kit' }],
    assignedProgram: pick([foodDrive, medCamp], i)._id, assignedManager: pick(managers, i)._id, status: 'active',
  })));

  // Donations
  const donors = [['Tata Trusts', 'organization', 150000, 'bank-transfer'], ['Neha Kulkarni', 'individual', 5000, 'upi'], ['Rajesh Malhotra', 'individual', 12000, 'card'], ['Green Valley School', 'organization', 25000, 'cheque'], ['Anonymous', 'anonymous', 2000, 'cash'],
    ['Sanjay Bhatia', 'individual', 7500, 'upi'], ['Local Grocers Association', 'organization', 0, 'in-kind'], ['Pooja Reddy', 'individual', 3000, 'online'], ['Amit Jain', 'individual', 10000, 'upi'], ['Book Lovers Club', 'organization', 0, 'in-kind']];
  await M.Donation.insertMany(donors.map(([donorName, donorType, amount, paymentMethod], i) => ({
    donorName, donorType, amount, paymentMethod, email: donorType === 'anonymous' ? undefined : `${donorName.split(' ')[0].toLowerCase()}@example.com`,
    donationType: amount === 0 ? (i === 6 ? 'food' : 'books') : 'money', donationDate: ago(i * 12 + 1), campaign: pick(['Winter Relief', 'Back to School', 'Hunger Free'], i),
    purpose: pick(['Food kits', 'School supplies', 'General fund'], i), receiptNumber: `RCPT-2026-${String(i + 1).padStart(4, '0')}`,
    transactionId: paymentMethod === 'cash' || amount === 0 ? undefined : `TXN${100000 + i * 137}`,
  })));

  // Food inventory + distributions (saved one by one so remaining stock is computed)
  const foodRows = [['Rice', 500, 'kg', 120, 180], ['Wheat flour', 300, 'kg', 90, 220], ['Lentils', 200, 'kg', 60, 192], ['Cooking oil', 120, 'litre', 30, 40], ['Biscuit packets', 400, 'packets', 6, 100]];
  const food = [];
  for (const [foodItem, quantity, unit, expiryIn, distributed] of foodRows) {
    food.push(await M.FoodInventory.create({
      foodItem, quantity, unit, expiryDate: ahead(expiryIn), source: 'Donation', storageLocation: 'Main store room', receivedDate: ago(25), distributedQuantity: distributed, lowStockThreshold: 20,
    }));
  }
  await M.FoodDistribution.insertMany([
    { date: ago(7), location: 'Sector 14 Community Hall', items: [{ inventory: food[0]._id, foodItem: 'Rice', quantity: 90 }, { inventory: food[2]._id, foodItem: 'Lentils', quantity: 40 }], numberOfBeneficiaries: 85, assignedVolunteers: [volUsers[0]._id, volUsers[1]._id], manager: managerA._id, notes: 'Smooth distribution' },
    { date: ago(14), location: 'Sohna Road Settlement', items: [{ inventory: food[1]._id, foodItem: 'Wheat flour', quantity: 110 }], numberOfBeneficiaries: 70, assignedVolunteers: [volUsers[3]._id], manager: managerA._id },
  ]);

  // Resources
  await M.Resource.insertMany([
    { name: 'Laptops', category: 'computers', quantity: 6, condition: 'good', location: 'Computer lab', status: 'inUse', value: 240000, purchaseOrDonationDate: ago(300) },
    { name: 'Storybooks (Hindi & English)', category: 'books', quantity: 350, condition: 'good', location: 'Library shelf', status: 'available', value: 52000 },
    { name: 'First aid kits', category: 'medicalSupplies', quantity: 4, condition: 'new', location: 'Store room', status: 'available', value: 8000 },
    { name: 'Tempo van', category: 'vehicles', quantity: 1, condition: 'fair', location: 'Office parking', status: 'assigned', assignedPerson: managerA._id, value: 450000 },
    { name: 'Folding tables', category: 'furniture', quantity: 12, condition: 'good', location: 'Main hall', status: 'available', value: 36000 },
    { name: 'Projector', category: 'equipment', quantity: 1, condition: 'poor', location: 'Office', status: 'maintenance', value: 30000 },
  ]);

  // Events
  const [evt1, evt2] = await M.Event.insertMany([
    { name: 'Winter Food Drive', description: 'Distributing warm meals and ration kits.', date: ahead(5), startTime: '09:00', endTime: '14:00', location: 'Sector 14 Community Hall', programType: 'Food Distribution Drive', program: foodDrive._id, organizer: admin._id, manager: managerA._id, assignedVolunteers: [volUsers[0]._id, volUsers[1]._id, volUsers[3]._id], status: 'upcoming' },
    { name: 'Back to School Camp', description: 'Free notebooks, bags and counselling.', date: ahead(12), startTime: '10:00', endTime: '15:00', location: 'Government School Ground', programType: 'Education Camp', program: eduCamp._id, organizer: admin._id, manager: managerB._id, assignedVolunteers: [volUsers[2]._id], status: 'upcoming' },
    { name: 'Health Check-up Day', description: 'Free check-ups and medicines.', date: ago(20), startTime: '09:30', endTime: '13:30', location: 'Primary Health Centre', programType: 'Medical Camp', program: medCamp._id, organizer: admin._id, manager: managerB._id, status: 'completed' },
  ]);

  // Tasks
  const taskRows = [
    ['Pack 100 ration kits', volUsers[0], managerA, 'high', 'inProgress', 2], ['Set up stage and tables', volUsers[1], managerA, 'medium', 'assigned', 4],
    ['Collect donated books', volUsers[2], managerB, 'low', 'completed', -3], ['Update student attendance sheet', volUsers[2], managerB, 'medium', 'accepted', 1],
    ['Arrange van for food drive', volUsers[3], managerA, 'urgent', 'assigned', 1], ['Call donors for receipts', volUsers[1], managerA, 'low', 'completed', -6],
    ['Prepare camp banners', volUsers[3], managerB, 'medium', 'inProgress', 7], ['Inventory count of store room', volUsers[0], managerA, 'high', 'assigned', -1],
  ];
  const tasks = await M.Task.insertMany(taskRows.map(([title, u, m, priority, status, due], i) => ({
    title, description: `${title} for the upcoming programs.`, assignedUser: u._id, createdBy: m._id, priority, status, startDate: ago(3), dueDate: ahead(due),
    category: pick(['Logistics', 'Education', 'Fundraising'], i), location: 'NGO Office', completedAt: status === 'completed' ? ago(1) : undefined,
    comments: i === 0 ? [{ user: managerA._id, text: 'Please finish before Friday.' }] : [],
  })));

  // Notifications and activity log
  await M.Notification.insertMany([
    { user: volUsers[0]._id, type: 'task-assigned', title: 'New task: Pack 100 ration kits', link: '/volunteer/tasks' },
    { user: volUsers[3]._id, type: 'task-deadline', title: 'Task due tomorrow: Arrange van for food drive', link: '/volunteer/tasks' },
    { user: managerA._id, type: 'food-low', title: 'Low stock: Cooking oil', message: '80 litre left.', link: '/manager' },
    { user: managerA._id, type: 'food-expiring', title: 'Expiring soon: Biscuit packets', message: 'Expires in 6 days.', link: '/manager' },
    { user: admin._id, type: 'donation-received', title: 'Donation received: ₹1,50,000', message: 'From Tata Trusts', link: '/admin' },
    { user: managerB._id, type: 'event-upcoming', title: `Upcoming: ${evt2.name}`, link: '/manager/events' },
  ]);
  await M.ActivityLog.insertMany([
    { user: admin._id, action: 'create', module: 'users', recordId: managerA._id, newValue: { role: 'manager' } },
    { user: managerA._id, action: 'create', module: 'tasks', recordId: tasks[0]._id, newValue: { title: tasks[0].title } },
    { user: admin._id, action: 'create', module: 'events', recordId: evt1._id, newValue: { name: evt1.name } },
  ]);

  // Organization + website content (Phase 6 CMS reads/writes these)
  await M.Organization.create({ name: 'Asha Kiran Foundation', tagline: 'Food, education and care for every child', email: 'hello@ashakiran.org', phone: '+91 98100 00000', address: 'Sohna Road, Gurugram, Haryana' });
  await M.WebsiteContent.insertMany([
    { section: 'hero', content: { title: 'Every child deserves a full plate and a full classroom', description: 'We serve hot meals, run learning camps and support families across Gurugram.' } },
    { section: 'mission', content: { text: 'To make sure no child in our neighbourhoods goes to bed hungry or misses school.' } },
  ]);

  console.log('\nSeed complete. Demo accounts (password for all: ' + PASSWORD + '):');
  console.log('  admin    admin@ngo.org');
  console.log('  manager  meera.manager@ngo.org  (tasks, volunteers, food, events)');
  console.log('  manager  rahul.manager@ngo.org  (students, beneficiaries, tasks)');
  console.log('  volunteer volunteer1@ngo.org ... volunteer4@ngo.org  (volunteer5 is pending approval)\n');
  console.log('Modules available:', Object.keys(MODULES).length, 'permission groups');
}

run().then(() => mongoose.disconnect()).catch((e) => { console.error(e.message); process.exit(1); });

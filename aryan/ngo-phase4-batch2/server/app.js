const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || '').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Only profile photos are served publicly. Documents are downloaded through /api/documents/:id/download, which checks permission and scope.
app.use('/uploads/avatars', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'avatars')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: {} }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/lookups', require('./routes/lookupRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/volunteers', require('./routes/volunteerRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/beneficiaries', require('./routes/beneficiaryRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/food', require('./routes/foodRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
// Next batches mount: /tasks /events /programs /reports /notifications /activity-logs /website

app.use(notFound);
app.use(errorHandler);

module.exports = app;

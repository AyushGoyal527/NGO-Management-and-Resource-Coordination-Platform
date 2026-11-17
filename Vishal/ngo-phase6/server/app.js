const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
// Behind a load balancer or reverse proxy, set TRUST_PROXY (for example 1) so rate limits see each visitor's real IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || '').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Only profile photos are served publicly. Documents are downloaded through /api/documents/:id/download, which checks permission and scope.
app.use('/uploads/site', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'site'), { index: false, dotfiles: 'deny' }));
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
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/programs', require('./routes/programRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/activity-logs', require('./routes/activityRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/website', require('./routes/websiteRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

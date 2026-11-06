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

// Only profile photos are served publicly. Documents will go through authorized endpoints in a later phase.
app.use('/uploads/avatars', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'avatars')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: {} }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
// Later phases mount: /volunteers /students /beneficiaries /donations /food /resources /tasks /events /programs /reports /notifications /activity-logs /website

app.use(notFound);
app.use(errorHandler);

module.exports = app;

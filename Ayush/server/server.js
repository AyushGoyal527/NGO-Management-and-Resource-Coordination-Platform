require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET must be set to a long random string (see .env.example)');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => { console.error('Failed to start:', err.message); process.exit(1); });

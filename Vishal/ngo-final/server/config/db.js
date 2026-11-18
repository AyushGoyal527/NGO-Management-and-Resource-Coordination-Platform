const mongoose = require('mongoose');

module.exports = async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  mongoose.set('strictQuery', true);
  console.log('Connecting to MongoDB...');
  try {
    // Give up after 8 seconds instead of Mongoose's 30, so a missing database is reported quickly.
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    throw new Error(`Could not reach MongoDB at ${process.env.MONGO_URI.replace(/\/\/[^@/]*@/, '//***@')}. Is MongoDB running (version 4.2 or newer)? ${err.message}`);
  }
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

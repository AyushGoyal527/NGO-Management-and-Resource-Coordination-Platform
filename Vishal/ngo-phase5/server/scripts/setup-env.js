// Creates server/.env on first run with a fresh random JWT_SECRET. Safe to run repeatedly.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');
const secret = () => crypto.randomBytes(48).toString('hex');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, fs.readFileSync(examplePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret()}`));
  console.log('Created server/.env with a new JWT_SECRET. Check MONGO_URI in it if your MongoDB is not on localhost.');
} else {
  let text = fs.readFileSync(envPath, 'utf8');
  const m = text.match(/^JWT_SECRET=(.*)$/m);
  if (!m || m[1].trim().length < 16 || m[1].includes('replace-with')) {
    text = m ? text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret()}`) : `${text.trimEnd()}\nJWT_SECRET=${secret()}\n`;
    fs.writeFileSync(envPath, text);
    console.log('Set a new JWT_SECRET in server/.env');
  }
}

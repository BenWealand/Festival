const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Generate self-signed certificate using Node.js
const selfSigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfSigned.generate(attrs, {
  algorithm: 'sha256',
  days: 365,
  keySize: 2048,
});

// Write the certificates to files
fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);
fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);

console.log('Self-signed certificates generated successfully!');
console.log('Private key:', path.join(certsDir, 'key.pem'));
console.log('Certificate:', path.join(certsDir, 'cert.pem')); 
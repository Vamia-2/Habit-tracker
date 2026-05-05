const fs = require('fs')
const path = require('path')
const selfsigned = require('selfsigned')

const attrs = [{ name: 'commonName', value: 'localhost' }]
const opts = { days: 365, keySize: 2048, algorithm: 'sha256', extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] }] }

const pems = selfsigned.generate(attrs, opts)

const outDir = path.resolve(__dirname, '..')
const keyPath = path.join(outDir, 'localhost-key.pem')
const certPath = path.join(outDir, 'localhost-cert.pem')

fs.writeFileSync(keyPath, pems.private)
fs.writeFileSync(certPath, pems.cert)

console.log('✅ Wrote:', certPath)
console.log('✅ Wrote:', keyPath)
console.log('\nℹ️ To trust the cert in Windows (CurrentUser Trusted Root) run:')
console.log("Import-Certificate -FilePath 'localhost-cert.pem' -CertStoreLocation Cert:\\CurrentUser\\Root")

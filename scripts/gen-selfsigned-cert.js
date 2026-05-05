#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const selfsigned = require('selfsigned')

const attrs = [{ name: 'commonName', value: 'localhost' }]
const opts = { days: 365, keySize: 2048, algorithm: 'sha256', extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] }] }

const { private: keyPem, cert: certPem } = selfsigned.generate(attrs, opts)

const outDir = path.resolve(__dirname, '..')
const keyPath = path.join(outDir, 'localhost-key.pem')
const certPath = path.join(outDir, 'localhost-cert.pem')

fs.writeFileSync(keyPath, keyPem)
fs.writeFileSync(certPath, certPem)

console.log('✅ Wrote:', certPath)
console.log('✅ Wrote:', keyPath)
console.log('ℹ️ You can import the cert into Windows Trusted Root using PowerShell:')
console.log("Import-Certificate -FilePath 'localhost-cert.pem' -CertStoreLocation Cert:\\CurrentUser\\Root")

const fs = require('fs')
const path = require('path')
const selfsigned = require('selfsigned')

const pems = selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' }
        ]
      }
    ]
  }
)

const outDir = path.resolve(__dirname, '..', '..')
fs.writeFileSync(path.join(outDir, 'localhost-key.pem'), pems.private)
fs.writeFileSync(path.join(outDir, 'localhost-cert.pem'), pems.cert)

console.log('generated localhost-cert.pem and localhost-key.pem')

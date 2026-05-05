const https = require('https')

function post(path, data) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }

    const req = https.request(opts, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        resolve({ status: res.statusCode, body })
      })
    })

    req.on('error', (e) => reject(e))
    req.write(data)
    req.end()
  })
}

;(async () => {
  try {
    console.log('Registering test user...')
    const reg = await post('/api/register', JSON.stringify({ email: 'testuser@example.com', password: 'Passw0rd!', username: 'testuser' }))
    console.log('Register response:', reg.status, reg.body)

    console.log('Logging in...')
    const login = await post('/api/login', JSON.stringify({ email: 'testuser@example.com', password: 'Passw0rd!' }))
    console.log('Login response:', login.status, login.body)
  } catch (e) {
    console.error('Request error:', e)
  }
})()

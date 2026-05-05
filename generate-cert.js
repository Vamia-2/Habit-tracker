#!/usr/bin/env node
// Generate self-signed certificate for localhost HTTPS
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = __dirname;
const certPath = path.join(certDir, 'localhost-cert.pem');
const keyPath = path.join(certDir, 'localhost-key.pem');

// Check if cert already exists
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificate already exists at:', certPath);
  process.exit(0);
}

try {
  // Try to use mkcert if available
  console.log('🔐 Attempting to install mkcert...');
  execSync('npm install -g mkcert', { stdio: 'inherit' });
  
  console.log('🔐 Generating certificate with mkcert...');
  execSync(`mkcert -install && mkcert localhost`, { 
    cwd: certDir,
    stdio: 'inherit' 
  });
  
  // mkcert creates localhost.pem and localhost-key.pem
  console.log('✅ Certificate created successfully!');
} catch (e) {
  // Fallback: Generate with openssl or built-in tools
  console.log('⚠️ mkcert not available, trying alternative method...');
  
  try {
    // Use PowerShell to generate self-signed cert (Windows)
    const psCmd = `
$cert = New-SelfSignedCertificate -CertStoreLocation cert:\\CurrentUser\\My -DnsName "localhost" -FriendlyName "Localhost Dev" -Type Custom -Subject "CN=localhost" -KeyAlgorithm "RSA" -KeyLength 2048 -Signer (Get-ChildItem Cert:\\CurrentUser\\My -Recurse | Where {$_.Subject -match "CN=localhost"})[0]
Export-PfxCertificate -Cert $cert -FilePath "${keyPath.replace(/\\/g, '\\\\')}" -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
Export-Certificate -Cert $cert -FilePath "${certPath.replace(/\\/g, '\\\\')}" -Type CERT -Force
    `;
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
    console.log('✅ Certificate created with PowerShell');
  } catch (psError) {
    console.error('❌ Failed to generate certificate:', psError.message);
    console.log('\n📝 Manual instructions:');
    console.log('1. Download mkcert: https://github.com/FiloSottile/mkcert/releases');
    console.log('2. Run: mkcert localhost');
    console.log('3. Move localhost.pem to ' + certPath);
    console.log('4. Move localhost-key.pem to ' + keyPath);
    process.exit(1);
  }
}

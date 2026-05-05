$thumbprint = "8596C64CC1641342486F2FAEB9FF1620142F7293"
$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq $thumbprint }

# Export certificate as .pem
$certPath = "localhost-cert.pem"
$cert | Export-Certificate -FilePath $certPath -Type CERT -Force | Out-Null

# For the key, we need to use OpenSSL or certutil
# Using certutil to export pfx, then convert to pem
$pfxPath = "temp-cert.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password (ConvertTo-SecureString -String "temp" -AsPlainText -Force) | Out-Null

Write-Host "✅ Certificate exported to $certPath"
Write-Host "📝 PFX file: $pfxPath (you may need to convert this to PEM format)"
Write-Host "🔐 Certificate Thumbprint: $thumbprint"
Write-Host ""
Write-Host "To convert PFX to PEM files, you can use:"
Write-Host "  openssl pkcs12 -in temp-cert.pfx -out localhost-key.pem -nodes -nocerts -passin pass:temp"
Write-Host "  openssl pkcs12 -in temp-cert.pfx -out localhost-cert.pem -nokeys -passin pass:temp"

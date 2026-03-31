import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import webpush from "web-push"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, "../.env")

const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : ""
if (existing.includes("PUBLIC_KEY=") || existing.includes("PRIVATE_KEY=")) {
  if (!process.argv.includes("--force")) {
    console.log(".env вже містить PUBLIC_KEY або PRIVATE_KEY.")
    console.log("Якщо потрібно згенерувати заново, запусти з --force")
    process.exit(0)
  }
}

const keys = webpush.generateVAPIDKeys()
const vapidEnv = `\n# VAPID PUSH KEYS\nPUBLIC_KEY=${keys.publicKey}\nPRIVATE_KEY=${keys.privateKey}\n`
const cleanEnv = existing
  .replace(/\n?PUBLIC_KEY=.*(?:\n|$)/, "")
  .replace(/\n?PRIVATE_KEY=.*(?:\n|$)/, "")

fs.writeFileSync(envPath, cleanEnv.trimEnd() + vapidEnv, "utf8")

console.log("✅ VAPID keys generated and saved to .env")
console.log(`PUBLIC_KEY=${keys.publicKey}`)
console.log(`PRIVATE_KEY=${keys.privateKey}`)
console.log("Якщо потрібно, збережи .env у безпечному місці і не коміть його в git.")

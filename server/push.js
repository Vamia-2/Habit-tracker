import webpush from "web-push"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

webpush.setVapidDetails(
  "mailto:test@test.com",
  process.env.PUBLIC_KEY,
  process.env.PRIVATE_KEY
)

export const sendPush = (sub, data, opts = {}) => {
  console.log("📤 Sending push to endpoint:", sub.endpoint.substring(0, 50) + "...")
  const payload = JSON.stringify(data)
  console.log("📤 Payload:", payload)
  const options = {
    TTL: typeof opts.TTL === 'number' ? opts.TTL : 60 * 60, // default 1 hour
    // Add high urgency header when requested to encourage delivery on mobile
    headers: Object.assign({}, opts.headers || {}, { Urgency: opts.urgency || 'high' })
  }

  return webpush.sendNotification(sub, payload, options)
    .then(result => {
      console.log("✅ Push sent successfully:", result)
      return result
    })
    .catch(err => {
      console.error("❌ Push send failed:", err.message, "Status:", err.statusCode)
      throw err
    })
}
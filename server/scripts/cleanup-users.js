import mongoose from "mongoose"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

import User from "../models/User.js"
import Habit from "../models/Habit.js"
import Message from "../models/Message.js"
import Complaint from "../models/Complaint.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../../.env") })

function getArgValue(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function getArgValues(name) {
  const values = []
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === name && process.argv[i + 1]) {
      values.push(process.argv[i + 1])
    }
  }
  return values
}

function hasArg(name) {
  return process.argv.includes(name)
}

function printHelp() {
  console.log("Використання:")
  console.log("  node scripts/cleanup-users.js [options]")
  console.log("")
  console.log("Опції:")
  console.log("  --email-contains <text>    Видалити користувачів, у яких email містить text (можна кілька разів)")
  console.log("  --created-after <date>     Видалити користувачів, створених після дати (YYYY-MM-DD)")
  console.log("  --created-before <date>    Видалити користувачів, створених до дати (YYYY-MM-DD)")
  console.log("  --exclude-email <email>    Виключити конкретний email з видалення (можна кілька разів)")
  console.log("  --exclude-role <role>      Виключити роль з видалення (можна кілька разів, типово: admin)")
  console.log("  --dry-run                  Показати, що буде видалено, без фактичного видалення")
  console.log("  --help                     Показати цю довідку")
  console.log("")
  console.log("Приклади:")
  console.log("  node scripts/cleanup-users.js --email-contains test --dry-run")
  console.log("  node scripts/cleanup-users.js --created-after 2026-04-01 --exclude-email admin@gmail.com")
}

async function main() {
  if (hasArg("--help")) {
    printHelp()
    return
  }

  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error("У .env відсутній MONGO_URI")
  }

  const emailContainsList = getArgValues("--email-contains")
  const excludeEmails = new Set(getArgValues("--exclude-email").map((v) => v.toLowerCase()))
  const excludeRoles = new Set(getArgValues("--exclude-role"))
  if (excludeRoles.size === 0) excludeRoles.add("admin")

  const createdAfter = getArgValue("--created-after")
  const createdBefore = getArgValue("--created-before")
  const dryRun = hasArg("--dry-run")

  const query = {}

  if (emailContainsList.length > 0) {
    query.$or = emailContainsList.map((chunk) => ({
      email: { $regex: chunk, $options: "i" }
    }))
  }

  if (createdAfter || createdBefore) {
    query.createdAt = {}
    if (createdAfter) query.createdAt.$gt = new Date(createdAfter)
    if (createdBefore) query.createdAt.$lt = new Date(createdBefore)
  }

  await mongoose.connect(mongoUri)

  try {
    let users = await User.find(query).select("_id email username role createdAt")

    users = users.filter((u) => {
      if (excludeEmails.has((u.email || "").toLowerCase())) return false
      if (excludeRoles.has(u.role)) return false
      return true
    })

    if (users.length === 0) {
      console.log("Користувачів за цими фільтрами не знайдено.")
      return
    }

    const ids = users.map((u) => String(u._id))

    console.log(`Знайдено користувачів: ${users.length}`)
    users.slice(0, 20).forEach((u) => {
      console.log(`- ${u.email} (${u.username}) role=${u.role} createdAt=${u.createdAt.toISOString()}`)
    })
    if (users.length > 20) console.log(`... і ще ${users.length - 20}`)

    if (dryRun) {
      console.log("Режим dry-run: нічого не видалено.")
      return
    }

    const [habitsDeleted, messagesDeleted, complaintsDeleted, userLinksUpdated, usersDeleted] = await Promise.all([
      Habit.deleteMany({ user: { $in: ids } }),
      Message.deleteMany({
        $or: [
          { sender: { $in: ids } },
          { receiver: { $in: ids } }
        ]
      }),
      Complaint.deleteMany({
        $or: [
          { reporter: { $in: ids } },
          { reportedUser: { $in: ids } }
        ]
      }),
      User.updateMany({}, { $pull: { followers: { $in: ids }, following: { $in: ids } } }),
      User.deleteMany({ _id: { $in: ids } })
    ])

    console.log(`Видалено користувачів: ${usersDeleted.deletedCount || 0}`)
    console.log(`Видалено звичок: ${habitsDeleted.deletedCount || 0}`)
    console.log(`Видалено повідомлень: ${messagesDeleted.deletedCount || 0}`)
    console.log(`Видалено скарг: ${complaintsDeleted.deletedCount || 0}`)
    console.log(`Оновлено зв'язків між користувачами: ${userLinksUpdated.modifiedCount || 0}`)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (err) => {
  console.error("Помилка очищення:", err.message)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})

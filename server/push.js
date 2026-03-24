import webpush from "web-push"

webpush.setVapidDetails(
  "mailto:test@test.com",
  process.env.PUBLIC_KEY,
  process.env.PRIVATE_KEY
)

export const sendPush = (sub, data) => {
  return webpush.sendNotification(sub, JSON.stringify(data))
}
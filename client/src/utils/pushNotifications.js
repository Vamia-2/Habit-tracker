import { subscribeToPushNotifications } from "../components/PushSettings"

export const ensurePushNotificationsReady = async () => {
  // Reuse the same flow: it already tests delivery and refreshes stale subscriptions.
  const result = await subscribeToPushNotifications()
  
  // Log Service Worker logs to console
  setTimeout(() => {
    const swLogs = JSON.parse(localStorage.getItem('sw_logs') || '[]')
    if (swLogs.length > 0) {
      console.log("📋 Service Worker logs:")
      swLogs.forEach(log => console.log("  " + log))
    } else {
      console.warn("⚠️ No Service Worker logs found - push events may not be reaching SW")
    }
  }, 1000)
  
  return result
}

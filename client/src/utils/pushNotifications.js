import { subscribeToPushNotifications } from "../components/PushSettings"

export const ensurePushNotificationsReady = async () => {
  // Reuse the same flow: it already tests delivery and refreshes stale subscriptions.
  return subscribeToPushNotifications()
}

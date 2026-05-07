# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Push Notifications — Troubleshooting

If native notifications are not visible on your system, the app ships with extra diagnostics and an in-app fullscreen fallback.

Quick steps to troubleshoot:

1. Open DevTools → Application ("Storage") → Service Workers and click `Unregister` for any old workers.
2. Hard-reload the page (Ctrl+Shift+R) to force the browser to fetch the latest `sw.js`.
3. Ensure Notifications permission is `Allow` for the site (click lock icon in the address bar).
4. Enable push in the app and check Console for messages from the Service Worker or BroadcastChannel.

If you still don't see notifications, keep the tab open and the in-app overlay will show when a reminder arrives.

## Email Verification — Setup & Troubleshooting

**Email verification** is required for new user registration.

### Setup (Gmail with App Password)

**Important:** You must use a Google App Password, NOT your regular Gmail password!

1. Enable 2-step verification on your Google account:
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. Generate App Password:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select App: **Mail** | Device: **Windows Computer** (or other)
   - Google will generate a 16-character password like: `qutc bxam awyi efas`

3. Add to `.env` file:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=qutcbxamawiyefas
   EMAIL_FROM=noreply@habit-tracker.com
   FRONTEND_URL=https://your-deployed-url-or-localhost:5173
   ```
   **Note:** Remove spaces from the app password in `.env` (e.g., `qutcbxamawiyefas` not `qutc bxam awyi efas`)

4. Restart the server for changes to take effect

### Verify Email Configuration

**On server startup**, you should see in logs:
```
✅ [EMAIL] SMTP connection verified successfully
```

If you see an error, your email credentials are incorrect.

### Testing Email Delivery

**Test endpoint** (development only):
```bash
curl -X POST http://localhost:5000/api/debug/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected success response:
```json
{"success": true, "message": "Test email sent successfully"}
```

If test fails, check:
1. `.env` EMAIL_* variables are set correctly (no extra spaces)
2. Google 2-step verification is enabled
3. App password was generated correctly
4. Email hasn't reached daily sending limit (usually 500+ per day)
5. Check spam/junk folder

### Troubleshooting Registration Emails

After registering a new user, check server logs:

**Success logs:**
```
✅ [REGISTER] User user@example.com created, token: abc123def456...
✅ [EMAIL] Verification email sent successfully to user@example.com, ID: <message-id>
```

**Failure logs:**
```
❌ [EMAIL] Failed to send verification email to user@example.com: Invalid login
```

**Common errors:**
- `Invalid login` → Wrong email/password (use app password, not regular password)
- `ECONNREFUSED` → SMTP connection failed (wrong host/port)
- `401 Unauthorized` → Credentials rejected (check for spaces in password)

### User Login After Email Verification

- After registration, users receive verification email
- User must click the link in email to verify
- Only verified users can log in
- Verification link expires after **24 hours**
- Can resend verification via `/api/resend-verification` endpoint


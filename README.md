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

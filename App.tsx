// Proxy Expo entrypoint for npm workspaces hoisting `node_modules` to the monorepo root.
// Expo's default AppEntry resolves `../../App` relative to `node_modules/expo`,
// so when dependencies are hoisted it ends up looking for `/workspace/innerbloomv3/App`.
// We keep the actual app under `apps/mobile/App.tsx` and simply re-export it here
// so `expo/AppEntry.js` can always find the component regardless of the working directory.
export { default } from './apps/mobile/App';

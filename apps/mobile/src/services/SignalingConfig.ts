import Constants from "expo-constants";

// Auth e P2P sempre usam a mesma configuração pública do Expo.
export const SIGNALING_URL = (
  Constants.expoConfig?.extra?.SIGNALING_SERVER_URL ??
  "https://signaling.cooperativa-worker.workers.dev"
).replace(/\/+$/, "");

/**
 * Layout raiz da aplicação.
 * Verifica estado de autenticação e redireciona para onboarding ou home.
 */
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useP2PStore } from "@/store/useP2PStore";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const { status, session, initialize } = useAuthStore();
  const { initService } = useP2PStore();
  const router = useRouter();
  const segments = useSegments();

  // Boot: verifica wallet salva
  useEffect(() => {
    initialize();
  }, []);

  // Inicializa P2P quando autenticado
  useEffect(() => {
    if (status === "authenticated" && session) {
      initService(session.profile.did);
    }
  }, [status, session]);

  // Roteamento baseado no estado de auth
  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (status === "checking" || status === "signing") return;

    if (status === "no_wallet" || status === "idle" || status === "error") {
      if (!inAuthGroup) router.replace("/(auth)/onboarding");
    } else if (status === "authenticated") {
      if (inAuthGroup) router.replace("/(app)/home");
    }
  }, [status, segments]);

  if (status === "checking") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === "authenticated" && !!session}>
        <Stack.Screen name="(app)/home" />
        <Stack.Screen name="(app)/active-ride" />
        <Stack.Screen name="(app)/incoming-call" />
        <Stack.Screen name="(app)/map-ride" />
        <Stack.Screen name="(app)/profile" />
        <Stack.Screen name="(app)/request-ride" />
      </Stack.Protected>
    </Stack>
  );
}

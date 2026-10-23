/**
 * Tela de Onboarding — Criação/Importação de Identidade Digital
 *
 * Primeira tela que o usuário vê. Explica o conceito SSI e permite:
 * 1. Criar nova identidade (gera par de chaves no dispositivo)
 * 2. Importar identidade existente (chave privada)
 */
import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";

type Step = "welcome" | "choose" | "import" | "creating";

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("welcome");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const { createNewWallet, importWallet, login, initialize, address, status, error } = useAuthStore();

  // Alert não acompanha promises. Este handler sempre consome a rejeição.
  const handleLogin = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setNotice(null);
    try {
      await login();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (pending.current) return;
    pending.current = true;
    setStep("creating");
    setLoading(true);
    try {
      const address = await createNewWallet();
      Alert.alert(
        "✅ Identidade criada!",
        `Seu endereço: ${address.slice(0, 10)}...${address.slice(-6)}\n\nSua chave privada está armazenada com segurança neste dispositivo.`,
        [{ text: "Continuar", onPress: handleLogin }]
      );
    } catch (err) {
      Alert.alert("Não foi possível criar a identidade", "Tente novamente. A criação é realizada neste dispositivo.");
      setStep("choose");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (pending.current) return;
    if (!privateKey.trim()) {
      Alert.alert("Erro", "Insira sua chave privada.");
      return;
    }
    pending.current = true;
    setLoading(true);
    setNotice(null);
    try {
      try {
        await importWallet(privateKey.trim());
      } catch {
        Alert.alert("Não foi possível importar", "Verifique a chave privada e tente novamente.");
        return;
      }
      setPrivateKey("");
      try { await login(); } catch (err) {
        setNotice(err instanceof Error ? err.message : "Não foi possível entrar. Sua identidade foi salva; tente novamente.");
      }
    } catch (err) {
      setNotice("Não foi possível entrar. Tente novamente com sua identidade salva.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  if (!address && (status === "idle" || status === "checking")) {
    return <View style={[s.container, s.centered]}><ActivityIndicator color="#6366f1" /><Text style={s.loadingText}>Verificando identidade salva...</Text></View>;
  }

  if (address || status === "error") {
    return (
      <View style={s.container}>
        <Text style={s.title}>{address ? "Sua identidade está salva" : "Recuperar acesso"}</Text>
        {address && <Text style={s.subtitle}>Endereço: {address.slice(0, 10)}...{address.slice(-6)}</Text>}
        <Text style={s.subtitle}>Tente entrar novamente. Não é necessário criar ou importar outra identidade.</Text>
        {(notice || error) && <Text accessibilityRole="alert" style={s.subtitle}>{notice || error}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          style={[s.primaryButton, (loading || status === "signing") && s.disabled]}
          disabled={loading || status === "signing"}
          onPress={address ? handleLogin : async () => {
            if (pending.current) return;
            pending.current = true;
            setLoading(true);
            try { await initialize(); } catch { setNotice("Não foi possível recuperar o acesso. Tente novamente."); }
            finally { pending.current = false; setLoading(false); }
          }}
        >
          {loading || status === "signing" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Tentar entrar novamente</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Welcome ──────────────────────────────────────────────────────────────

  if (step === "welcome") {
    return (
      <View style={s.container}>
        <View style={s.logoContainer}>
          <Ionicons name="people-circle" size={80} color="#6366f1" />
          <Text style={s.appName}>Cooperativa</Text>
          <Text style={s.tagline}>Sua identidade. Seu controle.</Text>
        </View>

        <View style={s.infoCard}>
          <InfoItem icon="lock-closed" text="Sua chave privada fica só no seu dispositivo" />
          <InfoItem icon="link" text="Login sem senha via assinatura digital (EIP-4361)" />
          <InfoItem icon="wifi" text="Comunicação direta P2P — sem intermediários" />
          <InfoItem icon="server" text="Sem taxas de plataforma para a cooperativa" />
        </View>

        <TouchableOpacity style={s.primaryButton} onPress={() => setStep("choose")}>
          <Text style={s.primaryButtonText}>Criar Minha Identidade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Choose ────────────────────────────────────────────────────────────────

  if (step === "choose") {
    return (
      <View style={s.container}>
        <Text style={s.title}>Como quer começar?</Text>

        <TouchableOpacity style={s.optionCard} onPress={handleCreateNew}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
          <View style={s.optionText}>
            <Text style={s.optionTitle}>Nova Identidade</Text>
            <Text style={s.optionDesc}>Gerar um novo par de chaves criptográficas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.optionCard} onPress={() => setStep("import")}>
          <Ionicons name="download" size={32} color="#10b981" />
          <View style={s.optionText}>
            <Text style={s.optionTitle}>Importar Identidade</Text>
            <Text style={s.optionDesc}>Usar chave privada existente (ex: MetaMask)</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Import ────────────────────────────────────────────────────────────────

  if (step === "import") {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Importar Chave Privada</Text>
        <Text style={s.subtitle}>
          Insira sua chave privada (0x...). Ela será armazenada com segurança no
          seu dispositivo e nunca enviada à rede.
        </Text>

        <TextInput
          style={s.input}
          placeholder="0x..."
          placeholderTextColor="#64748b"
          value={privateKey}
          onChangeText={setPrivateKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[s.primaryButton, loading && s.disabled]}
          onPress={handleImport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryButtonText}>Importar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.backButton} onPress={() => setStep("choose")}>
          <Text style={s.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Creating ──────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, s.centered]}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={s.loadingText}>Gerando chaves criptográficas...</Text>
      <Text style={s.loadingSubtext}>Sua identidade está sendo criada localmente</Text>
    </View>
  );
}

// ─── Sub-componente ───────────────────────────────────────────────────────────

function InfoItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.infoItem}>
      <Ionicons name={icon} size={20} color="#6366f1" />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 24,
    justifyContent: "center",
  },
  centered: { alignItems: "center" },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  appName: { fontSize: 36, fontWeight: "800", color: "#f8fafc", marginTop: 12 },
  tagline: { fontSize: 16, color: "#94a3b8", marginTop: 4 },
  title: { fontSize: 28, fontWeight: "700", color: "#f8fafc", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#94a3b8", marginBottom: 24, lineHeight: 22 },
  infoCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    gap: 16,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { color: "#cbd5e1", fontSize: 14, flex: 1 },
  primaryButton: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  optionCard: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    gap: 16,
  },
  optionText: { flex: 1 },
  optionTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "600" },
  optionDesc: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    color: "#f8fafc",
    fontSize: 14,
    marginBottom: 16,
    fontFamily: "monospace",
  },
  backButton: { alignItems: "center", marginTop: 16 },
  backButtonText: { color: "#94a3b8", fontSize: 14 },
  loadingText: { color: "#f8fafc", fontSize: 18, fontWeight: "600", marginTop: 16 },
  loadingSubtext: { color: "#94a3b8", fontSize: 13, marginTop: 8 },
});

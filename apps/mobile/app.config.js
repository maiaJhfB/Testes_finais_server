// Configuração pública do JS servido pelo Metro. Não altera o APK instalado.
module.exports = ({ config }) => {
  const override = process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL;
  if (override === undefined) return config;
  let url;
  try { url = new URL(override); } catch { throw new Error("EXPO_PUBLIC_SIGNALING_SERVER_URL deve ser uma URL HTTP(S) absoluta."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || (url.pathname !== '/' && url.pathname !== '') || override !== override.trim()) {
    throw new Error("EXPO_PUBLIC_SIGNALING_SERVER_URL deve conter apenas origem HTTP(S), sem credenciais, caminho, query ou fragmento.");
  }
  return { ...config, extra: { ...config.extra, SIGNALING_SERVER_URL: url.origin } };
};

export default function ServerPage() {
  const t = (key: string) => key;

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>{t("server.title")}</h1>
      <p>{t("server.subtitle")}</p>
    </main>
  );
}

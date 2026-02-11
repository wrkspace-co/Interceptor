const t = (key: string) => key;

export default function App() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "24px" }}>
      <h1>{t("solid.title")}</h1>
      <p>{t("solid.subtitle")}</p>
      <p>{t("solid.cta")}</p>
    </main>
  );
}

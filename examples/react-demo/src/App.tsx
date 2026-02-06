import { FormattedMessage, defineMessages, useIntl } from "react-intl";
import { t } from "./i18n";

const messages = defineMessages({
  greeting: { id: "greeting", defaultMessage: "Hello from defineMessages" },
  subtitle: { id: "subtitle", defaultMessage: "This is a demo subtitle" }
});

export default function App() {
  const intl = useIntl();

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>{t("Welcome to Interceptor")}</h1>
      <p>{t("This text is extracted from t() calls.")}</p>

      <p>
        {intl.formatMessage({
          id: "app.title",
          defaultMessage: "App title from formatMessage"
        })}
      </p>

      <FormattedMessage id="home.title" defaultMessage="Title from FormattedMessage" />

      <p>{intl.formatMessage(messages.greeting)}</p>
      <p>{intl.formatMessage(messages.subtitle)}</p>
    </div>
  );
}

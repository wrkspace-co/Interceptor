import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        "home.title": "Home Title",
        "home.subtitle": "Subtitle from i18next"
      }
    }
  }
});

export default i18n;

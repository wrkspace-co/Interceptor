<template>
  <main class="page">
    <h1>{{ title }}</h1>
    <p>{{ subtitle }}</p>
    <p>{{ legacyTitle }}</p>
    <p>{{ $t("vue.template") }}</p>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const title = t("vue.title");
const subtitle = t("vue.subtitle");

const legacyTitle = t("vue.legacy");
</script>

<style scoped>
.page {
  font-family: sans-serif;
  padding: 24px;
}
</style>

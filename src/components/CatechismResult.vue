<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  html: string
}>()

// The raw HTML might contain some badly formatted tags or excessive styles. 
// We inject it into a wrapper and apply tailwind typography styles if installed,
// but for now we'll just style the basic elements.
const cleanHtml = computed(() => {
  return props.html
})
</script>

<template>
  <div class="catechism-content prose prose-blue max-w-none" v-html="cleanHtml"></div>
</template>

<style>
/* Scoped styles applied to the injected Catholic CrossReference HTML */
.catechism-content {
  @apply text-gray-800 leading-relaxed text-lg;
}

.catechism-content .section {
  @apply mb-6;
}

.catechism-content .navigation {
  @apply text-sm text-gray-500 mb-2;
}

.catechism-content .navigation a {
  @apply text-blue-600 hover:text-blue-800 hover:underline;
}

.catechism-content .heading {
  @apply text-xl font-bold mt-8 mb-4 text-blue-900;
}

.catechism-content .paragraph {
  @apply flex flex-col md:flex-row gap-4 mb-6;
}

.catechism-content .number {
  @apply font-bold text-blue-800 shrink-0 pt-1 md:w-12 text-xl;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.catechism-content .text {
  @apply flex-grow;
}

.catechism-content .xrefs {
  @apply hidden; /* Hide the complex cross-refs block by default for a cleaner look */
}

.catechism-content .view-comments {
  @apply hidden; /* Hide comment feature */
}

.catechism-content .footnotes {
  @apply mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600;
}

.catechism-content .note {
  @apply flex gap-2 mb-2;
}

.catechism-content .num {
  @apply font-semibold;
}

.catechism-content a {
  @apply text-blue-600 hover:text-blue-800 hover:underline;
}

.catechism-content EM, .catechism-content I {
  @apply italic text-gray-700;
}
</style>
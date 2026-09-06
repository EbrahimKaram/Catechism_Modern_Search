<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  html: string
}>()

const router = useRouter()

// The raw HTML might contain some badly formatted tags or excessive styles. 
// We inject it into a wrapper and apply tailwind typography styles if installed,
// but for now we'll just style the basic elements.
const cleanHtml = computed(() => {
  return props.html
})

const CATECHISM_PATH_PREFIX = '/Catechism_Modern_Search/catechism/'

// Internal cross-reference/verse/breadcrumb links point at real catechism URLs (for crawlability),
// so intercept clicks on them here to keep in-app navigation client-side instead of a full page reload.
const onContentClick = (event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest('a')
  const href = link?.getAttribute('href')
  if (!href || !href.startsWith(CATECHISM_PATH_PREFIX)) return

  event.preventDefault()
  const query = decodeURIComponent(href.slice(CATECHISM_PATH_PREFIX.length))
  router.push({ name: 'catechism', params: { query } })
}
</script>

<template>
  <div class="catechism-content prose prose-blue max-w-none" v-html="cleanHtml" @click="onContentClick"></div>
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
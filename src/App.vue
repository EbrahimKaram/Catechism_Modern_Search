<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SearchBar from './components/SearchBar.vue'
import CatechismResult from './components/CatechismResult.vue'
import { fetchLocalData } from './services/api'

const query = ref('')
const htmlContent = ref('')
const loading = ref(false)
const error = ref('')

const handleSearch = async (searchQuery: string, updateHash = true) => {
  if (!searchQuery.trim()) return;
  
  if (updateHash) {
    window.location.hash = `!/search/${encodeURIComponent(searchQuery)}`;
  }
  
  query.value = searchQuery
  loading.value = true
  error.value = ''
  htmlContent.value = ''

  try {
    htmlContent.value = await fetchLocalData(searchQuery)
  } catch (err) {
      console.error(err)
      error.value = `Unable to fetch data. Please try searching for a paragraph number (e.g. "451").`
  } finally {
    loading.value = false
  }
}

const syncHash = () => {
  const hash = window.location.hash;
  if (hash.startsWith('#!/search/')) {
    const hashQuery = decodeURIComponent(hash.slice(10)); // remove '#!/search/'
    if (hashQuery && hashQuery !== query.value) {
      handleSearch(hashQuery, false);
    }
  }
}

onMounted(() => {
  syncHash();
  window.addEventListener('hashchange', syncHash);
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash);
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
    <!-- Header -->
    <header class="bg-blue-800 text-white shadow-md sticky top-0 z-10 py-4 px-6 relative">
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <svg class="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          <h1 class="text-2xl font-bold tracking-tight">Catholic Catechism</h1>
        </div>
        <SearchBar @search="handleSearch" class="w-full md:w-96" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
      <div v-if="loading" class="text-center py-20">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-800 mb-4"></div>
        <p class="text-gray-500 font-medium tracking-wide">Searching the Catechism...</p>
      </div>
      
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm my-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700 font-medium">{{ error }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="htmlContent" class="animate-fade-in">
         <div class="mb-6 pb-2 border-b-2 border-blue-100 flex justify-between items-end">
           <p class="text-sm text-gray-500 uppercase font-semibold tracking-wider">Results for <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">{{ query }}</span></p>
         </div>
         <div class="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-100">
            <CatechismResult :html="htmlContent" />
         </div>
      </div>

      <div v-else class="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
        <div class="bg-blue-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Find a Paragraph</h2>
        <p class="text-gray-500 max-w-md mx-auto leading-relaxed">Enter a paragraph number (e.g. <a href="#!/search/451" class="text-blue-600 hover:underline">451</a>), section reference (e.g. <a href="#!/search/1.1.2.3" class="text-blue-600 hover:underline">1.1.2.3</a>), or multiple ranges (e.g. <a href="#!/search/522,711-716,722" class="text-blue-600 hover:underline">522,711-716,722</a>) to dive into the teachings.</p>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-8 text-center text-sm border-t-4 border-blue-800">
      <div class="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <p>&copy; {{ new Date().getFullYear() }} Catholic Catechism Viewer</p>
        <p class="mt-2 md:mt-0">Data sourced from <a href="https://www.catholiccrossreference.online/" class="text-blue-400 hover:text-blue-300 transition-colors">catholiccrossreference.online</a></p>
      </div>
    </footer>
  </div>
</template>

<style>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

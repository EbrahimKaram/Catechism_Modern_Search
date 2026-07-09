<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['search'])
const inputVal = ref('')

const onSubmit = () => {
  emit('search', inputVal.value)
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="relative group w-full flex">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg class="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
      </svg>
    </div>
    <input 
      type="text" 
      v-model="inputVal" 
      class="block w-full pl-10 pr-3 py-2 md:py-3 border border-transparent rounded-l-lg leading-5 bg-blue-900 bg-opacity-50 text-white placeholder-blue-300 focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:ring-0 focus:border-white sm:text-sm transition duration-150 ease-in-out" 
      placeholder="Search paragraph (e.g. 451, 1.1.2.3)..." 
    />
    <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 md:py-3 px-4 rounded-r-lg transition-colors border-l border-blue-700">
      Search
    </button>
  </form>
</template>
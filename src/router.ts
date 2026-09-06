import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: App },
    { path: '/catechism/:query', name: 'catechism', component: App, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router

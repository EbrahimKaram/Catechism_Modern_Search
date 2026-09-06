import { createRouter, createWebHistory, createMemoryHistory, type Router } from 'vue-router'
import App from './App.vue'

export function createRouterInstance(isServer = typeof window === 'undefined'): Router {
  const history = isServer
    ? createMemoryHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL)

  return createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: App },
      { path: '/catechism/:query', name: 'catechism', component: App, props: true },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })
}

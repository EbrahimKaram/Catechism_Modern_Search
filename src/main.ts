import { createSSRApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import './style.css'
import App from './App.vue'
import { createRouterInstance } from './router'

export function createAppInstance() {
  const app = createSSRApp(App)
  const router = createRouterInstance(false)
  const head = createHead()

  app.use(router)
  app.use(head)

  return { app, router, head }
}

if (typeof window !== 'undefined') {
  const { app, router } = createAppInstance()
  router.isReady().then(() => {
    app.mount('#app')
  })
}

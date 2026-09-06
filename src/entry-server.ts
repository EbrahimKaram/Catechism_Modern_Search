import { createSSRApp } from 'vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'
import { createRouterInstance } from './router'
export { initSsrMasterData } from './services/api'

export function createAppInstance() {
  const app = createSSRApp(App)
  const router = createRouterInstance(true)
  const head = createHead()

  app.use(router)
  app.use(head)

  return { app, router, head }
}

export async function render(url: string) {
  const { app, router, head } = createAppInstance()

  await router.push(url)
  await router.isReady()

  const appHtml = await renderToString(app as any)
  const headPayload = await renderSSRHead(head)

  return {
    appHtml,
    headPayload,
  }
}

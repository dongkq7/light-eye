import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VueLightEye from '@light-eye/vue'

const app = createApp(App)
app.use(VueLightEye, { dsn: '/dsn-api/storage/tracing' })
app.mount('#app')

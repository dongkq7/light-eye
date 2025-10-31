import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { init } from '@light-eye/vue'

const { VueLightEye } = init({
  dsn: 'your dsn'
})
const app = createApp(App)
app.use(VueLightEye)
app.mount('#app')

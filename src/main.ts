import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { captureError } from './services/posthogAnalytics'

const app = createApp(App)

app.config.errorHandler = (err) => {
  captureError(err)
}

app.mount('#app')

import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

createRoot(document.getElementById('root')!).render(
  <App />
)

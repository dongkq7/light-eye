import { Login } from '@/pages/login'
import { createBrowserRouter } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <div>根目录</div>,
    children: [
      {
        path: 'projects',
        element: <div>projects</div>
      },
      {
        path: 'issues',
        element: <div>issues</div>
      }
    ]
  },
  {
    path: '/login',
    element: <Login />
  }
])

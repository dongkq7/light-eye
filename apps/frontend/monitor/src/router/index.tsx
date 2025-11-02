import { Login } from '@/pages/login'
import { createBrowserRouter } from 'react-router'
import AuthRoute from './AuthRoute'
import { Layout } from '@/layout'
import { Issues } from '@/pages/issues'
import { Projects } from '@/pages/projects'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthRoute>
        <Layout></Layout>
      </AuthRoute>
    ),
    children: [
      {
        path: 'projects',
        element: <Projects></Projects>
      },
      {
        path: 'issues',
        element: <Issues></Issues>
      }
    ]
  },
  {
    path: '/login',
    element: <Login />
  }
])

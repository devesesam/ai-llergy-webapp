import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-white/50">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm font-medium">Loading...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}

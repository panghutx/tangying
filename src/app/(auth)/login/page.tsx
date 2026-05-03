import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div>加载中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

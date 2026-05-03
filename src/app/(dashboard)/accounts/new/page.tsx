import { AccountForm } from "@/components/accounts/account-form"

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建账户</h1>
      <AccountForm />
    </div>
  )
}
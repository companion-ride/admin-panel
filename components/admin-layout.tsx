"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col relative">
        <Header />
        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-[1300px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

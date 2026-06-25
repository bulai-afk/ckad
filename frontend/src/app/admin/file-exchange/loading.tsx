import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function FileExchangeLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-h-0 h-screen flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />
          <main className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-slate-500">Загрузка файлообменника…</p>
          </main>
        </div>
      </div>
    </div>
  );
}

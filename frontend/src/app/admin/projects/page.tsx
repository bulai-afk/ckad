import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminProjectsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-0 flex-1 flex-col lg:ml-64 h-screen overflow-hidden">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-medium text-slate-900">
                Страница проектов
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Здесь будут список и управление проектами.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


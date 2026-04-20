import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminDocumentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-medium text-slate-900">Документы</div>
              <p className="mt-2 text-sm text-slate-600">
                Элемент добавления PDF-документов перенесен в раздел «Настройки».
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Здесь позже можно разместить список опубликованных документов и категории.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


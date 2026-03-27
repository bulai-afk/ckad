import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BannersEditorCarousel } from "@/components/admin/BannersEditorCarousel";
import { ReviewsVerticalCarousel } from "@/components/admin/ReviewsVerticalCarousel";

export default function AdminBannersPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-0 h-screen flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-900">
                  Страница банеров
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Здесь можно настраивать банеры для клиентских страниц.
                </p>
              </div>
              <BannersEditorCarousel />
              <ReviewsVerticalCarousel />
              <ReviewsVerticalCarousel title="Партнеры" apiPath="/api/pages/partners" aspect="square" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


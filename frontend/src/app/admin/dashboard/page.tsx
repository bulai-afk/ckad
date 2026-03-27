import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-0 flex-1 flex-col lg:ml-64 h-screen overflow-hidden">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-medium text-slate-900">
                Добро пожаловать на демо-версию
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Вам доступны следующие функции в админке:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>
                  <span className="font-medium">Редактор страниц</span> — создавать и
                  редактировать страницы и их структуру: добавлять/перемещать страницы по
                  папкам, настраивать блоки и элементы, а также управлять описанием и превью.
                </li>
                <li>
                  <span className="font-medium">Редактор баннеров</span> — настраивать баннеры,
                  тексты и кнопки, а также карусели с отзывами и партнёрами (с квадратными слайдами).
                </li>
                <li>
                  <span className="font-medium">Заявки (обратная связь)</span> — просматривать
                  заявки со всех форм на сайте и удалять выбранные записи.
                </li>
                <li>
                  <span className="font-medium">Настройки сайта</span> — задавать контакты,
                  ссылки на соцсети и реквизиты компании, чтобы они отображались на публичных страницах.
                </li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


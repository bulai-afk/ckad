import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { backendApiUrl } from "@/lib/backendApiUrl";
import { FileExchangeClient } from "./FileExchangeClient";
import type { FileExchangeRow } from "./types";

export const dynamic = "force-dynamic";

async function loadFileExchangeRows(): Promise<FileExchangeRow[]> {
  try {
    const res = await fetch(`${backendApiUrl()}/api/file-exchange`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { files?: FileExchangeRow[] };
    return Array.isArray(data?.files) ? data.files : [];
  } catch {
    return [];
  }
}

export default async function AdminFileExchangePage() {
  const initialFiles = await loadFileExchangeRows();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-0 h-screen flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <FileExchangeClient initialFiles={initialFiles} />
          </main>
        </div>
      </div>
    </div>
  );
}

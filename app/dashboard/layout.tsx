import { getUser } from "@/lib/dal";
import Sidebar from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        name={user?.name ?? user?.username ?? "User"}
        role={user?.role ?? ""}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

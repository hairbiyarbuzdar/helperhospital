import { getUser } from "@/lib/dal";
import Sidebar from "./sidebar";
import Footer from "../_components/footer";

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
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

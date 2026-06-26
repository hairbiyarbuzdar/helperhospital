import { ShieldCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { ROLE_LABEL, ROLE_MODULES, STAFF_ROLES } from "./constants";
import {
  CreateUserButton,
  EditUserButton,
  DeleteUserButton,
} from "./users-client";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default async function UsersPage() {
  const session = await verifySession();
  const isAdmin = session.role === "ADMIN";

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Split: admin row(s) at top as read-only, staff below as manageable.
  const admins = users.filter((u) => u.role === "ADMIN");
  const staff = users.filter((u) => u.role !== "ADMIN");

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">User Management</h1>
          <p className="mt-1 text-ink-muted">
            Manage staff accounts and their module access.
          </p>
        </div>
        {isAdmin && <CreateUserButton />}
      </div>

      {!isAdmin && (
        <p className="mt-6 rounded-xl border border-edge bg-warning-soft px-4 py-3 text-sm text-warning">
          You need admin privileges to create or manage users.
        </p>
      )}

      {/* Admin accounts (read-only) */}
      {admins.length > 0 && (
        <section className="mt-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
            <ShieldCheck className="h-4 w-4" />
            ADMINISTRATOR
          </p>
          <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                  <th className="px-6 py-3">USERNAME</th>
                  <th className="px-6 py-3">FULL NAME</th>
                  <th className="px-6 py-3">ROLE</th>
                  <th className="px-6 py-3">CREATED</th>
                  <th className="px-6 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u.id} className="border-b border-edge last:border-0">
                    <td className="px-6 py-4 font-semibold text-ink">{u.username}</td>
                    <td className="px-6 py-4 text-ink">{u.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {dateTimeFmt.format(u.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Staff accounts */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
            <ShieldCheck className="h-4 w-4" />
            STAFF ACCOUNTS
          </p>
          <span className="text-sm font-semibold text-ink-muted">
            {staff.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          {staff.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-muted">
              No staff users yet.{" "}
              {isAdmin && (
                <>
                  Click <span className="font-medium text-ink">Add user</span> to
                  create the first one.
                </>
              )}
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                  <th className="px-6 py-3">USERNAME</th>
                  <th className="px-6 py-3">FULL NAME</th>
                  <th className="px-6 py-3">ROLE</th>
                  <th className="px-6 py-3">MODULE ACCESS</th>
                  <th className="px-6 py-3">CREATED</th>
                  <th className="px-6 py-3">STATUS</th>
                  {isAdmin && <th className="px-6 py-3 text-right">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id} className="border-b border-edge last:border-0">
                    <td className="px-6 py-4 font-semibold text-ink">
                      {u.username}
                    </td>
                    <td className="px-6 py-4 text-ink">{u.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      <ModulePills role={u.role} />
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {dateTimeFmt.format(u.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          u.isActive
                            ? "bg-success-soft text-success"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <EditUserButton
                            user={{
                              id: u.id,
                              username: u.username,
                              name: u.name,
                              role: u.role,
                              isActive: u.isActive,
                            }}
                          />
                          <DeleteUserButton
                            user={{
                              id: u.id,
                              username: u.username,
                              name: u.name,
                              role: u.role,
                              isActive: u.isActive,
                            }}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  DOCTOR: "bg-canvas text-brand border border-edge",
  NURSE: "bg-canvas text-ink border border-edge",
  RECEPTIONIST: "bg-canvas text-ink border border-edge",
  PHARMACIST: "bg-canvas text-ink border border-edge",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[role] ?? "bg-canvas text-ink border border-edge"}`}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function ModulePills({ role }: { role: string }) {
  const staffRole = STAFF_ROLES.find((r) => r === role);
  const modules = staffRole ? ROLE_MODULES[staffRole] : [];
  return (
    <div className="flex flex-wrap gap-1">
      {modules.map((m) => (
        <span
          key={m}
          className="rounded-full bg-surface-soft px-2 py-0.5 text-xs text-ink-muted ring-1 ring-edge"
        >
          {m}
        </span>
      ))}
    </div>
  );
}

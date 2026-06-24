import { Eye } from "lucide-react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between bg-sidebar p-12 text-ink-onbrand lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-active">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-bold">Helper Hospital</p>
            <p className="text-sm text-sidebar-muted">Management System</p>
          </div>
        </div>

        <div className="max-w-sm">
          <h2 className="text-3xl font-semibold leading-snug">
            Everything your front desk needs, in one place.
          </h2>
          <p className="mt-4 text-sidebar-muted">
            Appointments, patients, tests, reports and payments — managed from a
            single, secure dashboard.
          </p>
        </div>

        <p className="text-xs text-sidebar-muted">
          © {new Date().getFullYear()} Helper Hospital. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-edge">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <p className="text-lg font-bold text-ink">Helper Hospital</p>
          </div>

          <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in to continue to your dashboard.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

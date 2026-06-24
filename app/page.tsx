import { redirect } from "next/navigation";

export default function Home() {
  // The proxy guard sends unauthenticated users to /login.
  redirect("/dashboard");
}

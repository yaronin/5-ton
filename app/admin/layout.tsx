import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?from=/admin");
  }
  if (!user.isAdmin) {
    redirect("/");
  }
  return children;
}

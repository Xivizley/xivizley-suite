import { redirect } from "next/navigation";

export default function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Kök adrese gelindiğinde /login rotasına yönlendir (parametreleri koruyarak)
  redirect("/login");
}

import { getTr } from "@/lib/i18n/server";
import { getUserDirectory } from "@/lib/actions/user-directory";
import UsersDirectoryClient from "./UsersDirectoryClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tr = await getTr();
  return {
  title: tr("ผู้ใช้งาน — PSU Store"),
  description: tr("ดูคะแนนความน่าเชื่อถือและรีวิวของผู้ขายบน PSU Store"),};
}

export default async function UsersPage() {
  const users = await getUserDirectory();
  return <UsersDirectoryClient users={users} />;
}

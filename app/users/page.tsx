import { getUserDirectory } from "@/lib/actions/user-directory";
import UsersDirectoryClient from "./UsersDirectoryClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ผู้ใช้งาน — PSU Store",
  description: "ดูคะแนนความน่าเชื่อถือและรีวิวของผู้ขายบน PSU Store",
};

export default async function UsersPage() {
  const users = await getUserDirectory();
  return <UsersDirectoryClient users={users} />;
}

import { redirect } from "next/navigation";

/** Legacy path — keep for old bookmarks */
export default function LiveLogsRedirectPage() {
  redirect("/live/ops");
}

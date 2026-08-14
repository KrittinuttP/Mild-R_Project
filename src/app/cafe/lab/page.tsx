import { redirect } from "next/navigation";

/** Old lab URL → secret */
export default function CafeLabRedirectPage() {
  redirect("/cafe/secret");
}

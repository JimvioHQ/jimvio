import { redirect } from "next/navigation";

/** Compatibility shim — canonical Orders live at `/orders`. */
export default function DashboardOrdersRedirect() {
  redirect("/orders");
}

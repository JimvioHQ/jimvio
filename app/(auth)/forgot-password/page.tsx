import { ForgotPasswordForm } from "./forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-authenticated";

export const metadata = {
  title: "Reset Password - Jimvio",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return <ForgotPasswordForm />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Career Radar AI",
  description: "Sign in to your Career Radar AI account.",
};

export default function LoginPage() {
  return (
    <GuestRoute>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to access your dashboard and saved opportunities."
        footer={
          <>
            By continuing, you agree to our{" "}
            <Link href="/" className="text-zinc-400 hover:text-white">
              Terms
            </Link>
            .
          </>
        }
      >
        <LoginForm />
      </AuthLayout>
    </GuestRoute>
  );
}

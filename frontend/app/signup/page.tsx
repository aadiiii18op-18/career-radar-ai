import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up — Career Radar AI",
  description: "Create your Career Radar AI account.",
};

export default function SignupPage() {
  return (
    <GuestRoute>
      <AuthLayout
        title="Create your account"
        subtitle="Join Career Radar AI and start discovering opportunities."
        footer={
          <>
            By creating an account, you agree to our{" "}
            <Link href="/" className="text-zinc-400 hover:text-white">
              Terms
            </Link>
            .
          </>
        }
      >
        <SignupForm />
      </AuthLayout>
    </GuestRoute>
  );
}

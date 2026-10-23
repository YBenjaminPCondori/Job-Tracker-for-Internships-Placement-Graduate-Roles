"use client";

import { useRouter } from "next/navigation";
import SigninForm from "./SigninForm";
import SignupForm from "./SignupForm";
import {
  APP_NAME,
  APP_TAGLINE,
  UPSTREAM_PROJECT_NAME,
  UPSTREAM_REPOSITORY_URL,
} from "@/lib/branding";

type AuthMode = "signin" | "signup";

interface AuthCardProps {
  mode: AuthMode;
}

export default function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-md px-4">
      {/* App branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>

      {/* Tab toggle */}
      <div className="mb-6 flex rounded-xl border bg-muted p-1">
        <button
          onClick={() => router.push("/signin")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => router.push("/signup")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {mode === "signin" ? (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>
            <SigninForm />
          </>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Get started</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to start tracking your applications
              </p>
            </div>
            <SignupForm />
          </>
        )}
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Based on the open-source{" "}
        <a
          href={UPSTREAM_REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {UPSTREAM_PROJECT_NAME}
        </a>{" "}
        project by Gsync.
      </p>
    </div>
  );
}

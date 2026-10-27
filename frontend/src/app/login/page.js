"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../page.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";

      const response = await fetch(API_URL + endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to sign in. Please try again.");
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a href="/" className="auth-brand">
          <span className="brand-mark">R</span>

          <span>
            Ricoz <span className="auth-muted">Commerce</span>
          </span>
        </a>

        <div className="auth-heading">
          <p className="eyebrow">BUNDLE & CROSS-SELL ENGINE</p>

          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>

          <p>
            {mode === "login"
              ? "Sign in to manage your product recommendations and bundle offers."
              : "Create an account to set up your own demo store."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => changeMode("login")}
          >
            Sign in
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => changeMode("register")}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>

          <label className="auth-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "register"
                  ? "At least 8 characters"
                  : "Enter your password"
              }
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
              required
            />
          </label>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="button primary auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Development prototype · Ricoz Bundle Engine
        </p>
      </section>
    </main>
  );
}

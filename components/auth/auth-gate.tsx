"use client";

import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

export function AuthGate({ children }: { children: ReactNode }) {
    const { data: session, isPending } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [adminValidated, setAdminValidated] = useState(false);
    const [validating, setValidating] = useState(false);

    // Check if user is authenticated (not anonymous)
    const isAuthenticated =
        session?.user &&
        session.user.name !== "Anonymous" &&
        !session.user.email?.startsWith("temp-");

    // Validate existing sessions on page load/reload
    useEffect(() => {
        if (!isAuthenticated || adminValidated || validating) return;

        setValidating(true);
        fetch("/api/validate-admin/session", { method: "POST" })
            .then((res) => res.json())
            .then(async (data) => {
                if (data.valid) {
                    setAdminValidated(true);
                } else {
                    // Non-admin user — sign them out
                    await signOut();
                    setError("Access denied. Only authorized users can access this app.");
                }
            })
            .catch(() => {
                // Graceful degradation — allow access if validation fails
                setAdminValidated(true);
            })
            .finally(() => setValidating(false));
    }, [isAuthenticated, adminValidated, validating]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Step 1: Validate email + password against admin env vars BEFORE Better Auth
            const validateRes = await fetch("/api/validate-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const validateData = await validateRes.json();

            if (!validateData.valid) {
                setError(validateData.error || "Access denied. Invalid credentials.");
                setLoading(false);
                return;
            }

            // Step 2: Credentials match admin — proceed with Better Auth
            if (mode === "signup") {
                const signUpRes = await signUp.email({
                    email,
                    password,
                    name: name || email.split("@")[0],
                });
                if (signUpRes.error) {
                    // If user already exists, try signing in
                    const signInRes = await signIn.email({ email, password });
                    if (signInRes.error) {
                        setError(signInRes.error.message || "Sign in failed");
                        setLoading(false);
                        return;
                    }
                    toast.success("Signed in successfully!");
                    setAdminValidated(true);
                    return;
                }
                // After sign-up, sign in
                const signInRes = await signIn.email({ email, password });
                if (signInRes.error) {
                    setError(signInRes.error.message || "Sign in failed");
                    setLoading(false);
                    return;
                }
                toast.success("Account created successfully!");
                setAdminValidated(true);
            } else {
                const res = await signIn.email({ email, password });
                if (res.error) {
                    // If account doesn't exist, auto-create it
                    const signUpRes = await signUp.email({
                        email,
                        password,
                        name: email.split("@")[0],
                    });
                    if (signUpRes.error) {
                        setError("Sign in failed. Please try signing up first.");
                        setLoading(false);
                        return;
                    }
                    const retryRes = await signIn.email({ email, password });
                    if (retryRes.error) {
                        setError(retryRes.error.message || "Sign in failed");
                        setLoading(false);
                        return;
                    }
                    toast.success("Account created and signed in!");
                    setAdminValidated(true);
                    return;
                }
                toast.success("Signed in successfully!");
                setAdminValidated(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    // Show loading state while session is being fetched
    if (isPending) {
        return (
            <div className="flex h-dvh w-full items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // If authenticated AND admin-validated, render the app
    if (isAuthenticated && adminValidated) {
        return <>{children}</>;
    }

    // If authenticated but validating, show verifying state
    if (isAuthenticated && !adminValidated) {
        return (
            <div className="flex h-dvh w-full items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">
                    Verifying access...
                </div>
            </div>
        );
    }

    // Show sign-in screen
    return (
        <div className="flex h-dvh w-full items-center justify-center bg-background">
            <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-lg">
                <div className="space-y-2 text-center">
                    <img
                        src="https://gostudio-web-cdn.b-cdn.net/public/99.svg"
                        alt="GoFlow Logo"
                        className="mx-auto h-10 w-10"
                    />
                    <h1 className="font-bold text-2xl">
                        {mode === "signin" ? "Sign In" : "Create Account"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {mode === "signin"
                            ? "Sign in to access the gostudio workflow"
                            : "Create an account to get started"}
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <Label htmlFor="gate-name">Name</Label>
                            <Input
                                id="gate-name"
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                type="text"
                                value={name}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="gate-email">Email</Label>
                        <Input
                            id="gate-email"
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            type="email"
                            value={email}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gate-password">Password</Label>
                        <Input
                            id="gate-password"
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            type="password"
                            value={password}
                        />
                    </div>
                    {error && <div className="text-destructive text-sm">{error}</div>}
                    <Button className="w-full" disabled={loading} type="submit">
                        {loading
                            ? "Loading..."
                            : mode === "signup"
                                ? "Sign Up"
                                : "Sign In"}
                    </Button>
                </form>

                {/* <div className="flex justify-center">
                    <button
                        className="text-muted-foreground text-sm hover:text-foreground"
                        onClick={() => {
                            setMode(mode === "signin" ? "signup" : "signin");
                            setError("");
                        }}
                        type="button"
                    >
                        {mode === "signin"
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </button>
                </div> */}
            </div>
        </div>
    );
}

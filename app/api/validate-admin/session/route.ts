import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.email) {
            return NextResponse.json({ valid: false, error: "Not authenticated" });
        }

        const adminEmail = process.env.ADMIN_EMAIL;

        // If no ADMIN_EMAIL is set, allow all authenticated users
        if (!adminEmail) {
            return NextResponse.json({ valid: true });
        }

        // Check if the session user's email matches the admin email
        const isAdmin = session.user.email.toLowerCase() === adminEmail.toLowerCase();

        return NextResponse.json({ valid: isAdmin, error: isAdmin ? undefined : "Access denied" });
    } catch (error) {
        console.error("Session validation error:", error);
        return NextResponse.json({ valid: false, error: "Validation failed" });
    }
}

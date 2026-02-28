import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // If no admin credentials are configured, allow all users
        if (!adminEmail || !adminPassword) {
            return NextResponse.json({ valid: true });
        }

        // Check if both email AND password match the admin credentials
        const emailMatch = email?.toLowerCase() === adminEmail.toLowerCase();
        const passwordMatch = password === adminPassword;

        if (emailMatch && passwordMatch) {
            return NextResponse.json({ valid: true });
        }

        return NextResponse.json({
            valid: false,
            error: "Access denied. Invalid credentials."
        });
    } catch (error) {
        console.error("Admin validation error:", error);
        return NextResponse.json({ valid: false, error: "Validation failed" });
    }
}

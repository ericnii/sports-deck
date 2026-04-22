import { NextResponse } from "next/server";
import { prisma } from "@/prisma/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth secrets are not configured in environment variables." },
        { status: 500 }
      );
    }

    const redirectUri = `${origin}/api/auth/oauth/google/callback`;

    // 1. Exchange the authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error("[Google OAuth Token Error]:", tokenData.error_description);
      return NextResponse.redirect(`${origin}/login?error=oauth_token_exchange`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch the user's Google profile using the access token
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      console.error("[Google OAuth] Failed to fetch user profile");
      return NextResponse.redirect(`${origin}/login?error=oauth_profile_fetch`);
    }

    const googleUser = await profileResponse.json();
    // Google userinfo returns: id, email, name, picture, given_name, family_name
    const googleEmail = googleUser.email;

    if (!googleEmail) {
      return NextResponse.redirect(`${origin}/login?error=oauth_no_email`);
    }

    // 3. Find or create user in DB
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
    });

    if (!user) {
      // Create a random secure password hash so direct credential login is impossible
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Derive a clean username from the Google display name
      const rawName = googleUser.name || googleUser.email.split("@")[0];
      let baseUsername = rawName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
      if (!baseUsername) baseUsername = `g_user_${crypto.randomBytes(4).toString("hex")}`;

      let uniqueUsername = baseUsername;
      let counter = 1;

      // Ensure username uniqueness
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: googleEmail,
          username: uniqueUsername,
          passwordHash,
          avatar: googleUser.picture || null,
        },
      });
    }

    // 4. Mint JWT cookies matching the existing app architecture
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Build response and set cookies
    const response = NextResponse.redirect(`${origin}/`);
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    response.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("[Google OAuth Callback Error]:", error);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=oauth_internal_error`);
  }
}

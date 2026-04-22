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

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GitHub OAuth secrets are not configured in environment variables." },
        { status: 500 }
      );
    }

    // 1. Exchange the code for an access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error("[GitHub OAuth Token Error]:", tokenData.error_description);
      return NextResponse.redirect(`${origin}/login?error=oauth_token_exchange`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const ghUser = await userResponse.json();

    // 3. Fetch User Emails (Primary email can be hidden from profile payload)
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    
    let ghEmail = ghUser.email;
    if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmailObj = emails.find((e) => e.primary) || emails[0];
        if (primaryEmailObj) {
            ghEmail = primaryEmailObj.email;
        }
    }

    if (!ghEmail) {
      return NextResponse.redirect(`${origin}/login?error=oauth_no_email`);
    }

    // 4. Find or create user in DB
    let user = await prisma.user.findUnique({
      where: { email: ghEmail },
    });

    if (!user) {
      // Create random secure password hash
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Derive unique username mapping from GitHub login
      let baseUsername = ghUser.login || `gh_user_${crypto.randomBytes(4).toString("hex")}`;
      let uniqueUsername = baseUsername;
      let counter = 1;
      
      // Ensure username uniqueness
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: ghEmail,
          username: uniqueUsername,
          passwordHash,
          avatar: ghUser.avatar_url || null,
        },
      });
    }

    // 5. Mint custom JWT cookies securely matching our existing architecture
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

    // 6. Build the response object and inject the cookies
    const response = NextResponse.redirect(`${origin}/`); // Redirect smoothly to dashboard feed
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
    console.error("[GitHub OAuth Callback Error]:", error);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=oauth_internal_error`);
  }
}

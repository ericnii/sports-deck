import { NextResponse } from "next/server";

export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured in environment variables." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = encodeURIComponent(`${origin}/api/auth/oauth/google/callback`);

  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&access_type=offline` +
    `&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}

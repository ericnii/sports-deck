import { NextResponse } from "next/server";

export async function GET(request) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID is not configured in environment variables." },
      { status: 500 }
    );
  }

  // Construct the redirect URI natively based on the incoming request to support multiple environments
  const origin = new URL(request.url).origin;
  const redirectUri = encodeURIComponent(`${origin}/api/auth/oauth/github/callback`);

  // Request the basic 'user:email' scope to grab their primary email
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user user:email`;

  return NextResponse.redirect(githubAuthUrl);
}

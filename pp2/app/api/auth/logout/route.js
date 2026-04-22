import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Clears the JWT cookie to invalidate the user's session.
 */
export async function POST(request) {
  try {
    // Create the response with a logout message
    const response = NextResponse.json(
      {
        message: "Logout successful.",
      },
      { status: 200 },
    );

    const isProd = process.env.NODE_ENV === "production";

    // Clear the authToken cookie
    response.cookies.set({
      name: "authToken",
      value: "",
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    // Clear the refreshToken cookie
    response.cookies.set({
      name: "refreshToken",
      value: "",
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred during logout. Please try again later.",
      },
      { status: 500 },
    );
  }
}

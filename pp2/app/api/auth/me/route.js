import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/prisma/db";

export async function GET(req) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/authToken=([^;]+)/);
  if (match) {
    try {
      const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
      
      // Fetch full user profile from DB to include role and other up-to-date attributes
      // Accommodate whichever ID format was stored in the JWT payload (userId or id)
      const userId = decoded.userId || decoded.id;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            avatar: true,
            isBanned: true,
            appeals: {
              where: { status: "PENDING" },
              select: { id: true, status: true, message: true }
            }
          }
        });
        if (user) {
          return NextResponse.json({ user });
        }
      }
      
      // Fallback to decoded token if DB fetch fails
      return NextResponse.json({ user: decoded });
    } catch { }
  }
  return NextResponse.json({ user: null });
}

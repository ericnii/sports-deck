import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/prisma/db";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request, { params }) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Read the current user session to determine `isFollowing` state
    let currentUserId = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("authToken")?.value;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.userId;
      }
    } catch (e) {
      // Ignore token errors, user is just browsing anonymously
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar: true,
        favoriteTeamId: true,
        role: true,
        followers: { select: { id: true } },
        following: { select: { id: true } },
        threads: {
          where: { hidden: false },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
        posts: {
          where: { 
            hidden: false,
            thread: { hidden: false }
          },
          select: {
            id: true,
            textContent: true,
            createdAt: true,
            threadId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine target team accurately by checking both String Name and Integer External ID
    let team = null;
    if (user.favoriteTeamId) {
      const teamIdInt = parseInt(user.favoriteTeamId, 10);
      if (!isNaN(teamIdInt)) {
        team = await prisma.team.findUnique({
          where: { externalId: teamIdInt },
          select: { id: true, name: true }
        });
      } else {
        team = await prisma.team.findFirst({
          where: { name: user.favoriteTeamId },
          select: { id: true, name: true }
        });
      }
    }

    const isFollowing = currentUserId 
      ? user.followers.some(f => f.id === currentUserId) 
      : false;

    // Structure precisely to match PublicProfileData interface
    const profileData = {
      id: user.id.toString(),
      username: user.username,
      avatar: user.avatar,
      favoriteTeamId: team ? team.name : user.favoriteTeamId,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing: isFollowing,
      createdAt: new Date().toISOString(), // Mocked mapping, as schema lacks User.createdAt
      threads: user.threads.map(t => ({
        id: t.id.toString(),
        title: t.title,
        createdAt: t.createdAt.toISOString()
      })),
      posts: user.posts.map(p => ({
        id: p.id.toString(),
        content: p.textContent,
        threadId: p.threadId.toString(),
        createdAt: p.createdAt.toISOString()
      })),
    };

    return NextResponse.json(profileData, { status: 200 });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

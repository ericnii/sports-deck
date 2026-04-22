import { NextResponse } from 'next/server';
import { prisma } from '../../../../../prisma/db.js';
import jwt from "jsonwebtoken"

export async function PATCH(request, { params }) {
    try {
        // Checking if user logged in
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const token = cookieStore.get("authToken")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        if (!decoded.userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Checking if user is admin
        const verifyUser = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!verifyUser) {
            return NextResponse.json({ error: "Appeal user id does not exist.", appealId: appealId }, { status: 400 });
        } else if (verifyUser.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { action } = await request.json();

        if (!action || typeof action !== "string" || (action !== "APPROVE" && action !== "REJECT")) {
            return NextResponse.json({ error: "Invalid action format." }, { status: 400 });
        }

        const appealId = parseInt(id);
        if (Number.isNaN(appealId)) {
            return NextResponse.json({ error: "Appeal id is not number" }, { status: 400 });
        }

        const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
        if (!appeal) {
            return NextResponse.json({ error: "Invalid appeal id." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: appeal.userId } });
        if (!user) {
            return NextResponse.json({ error: "Appeal userId does not exist.", appealId: appealId }, { status: 400 });
        }

        if (action === "APPROVE") {
            await prisma.appeal.update({
                where: { id: appealId },
                data: { status: "APPROVED" }
            });
            await prisma.user.update({
                where: { id: appeal.userId },
                data: { isBanned: false }
            });

            return NextResponse.json({ message: "User has been unbanned.", appealId: appealId, userId: appeal.userId }, { status: 200 });
        }

        await prisma.appeal.update({
            where: { id: appealId },
            data: { status: "REJECTED" }
        });
        return NextResponse.json({ message: "Appeal rejected.", appealId: appealId }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
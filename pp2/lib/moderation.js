import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/prisma/db.js";

const ai = new GoogleGenAI({});
const HIGH_TOXICITY_THRESHOLD = 0.7;

const moderationSchema = {
    type: "object",
    properties: {
        verdict: {
            type: "string",
            enum: ["INAPPROPRIATE", "SAFE"],
        },
        toxicityScore: {
            type: "number",
        },
        explanation: {
            type: "string",
        },
    },
    required: ["verdict", "toxicityScore", "explanation"],
};

export async function getAiAnalysis(content, userReason) {
    const prompt = `
        You are a professional community moderator. 
        Analyze the following user-generated content for:
        1. Hate speech, harassment, or bullying.
        2. Explicit or inappropriate language.
        3. Severe negativity that harms the community.

        User who reported this post said: "${userReason}"
        
        Content to review: "${content}"
    `;

    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: moderationSchema,
        },
    });

    return JSON.parse(result.text);
}

export function shouldAutoFlag(analysis) {
    if (!analysis) {
        return false;
    }

    const verdict = String(analysis.verdict || "").toUpperCase();
    const toxicityScore = Number(analysis.toxicityScore);

    return (
        verdict === "INAPPROPRIATE" ||
        (!Number.isNaN(toxicityScore) && toxicityScore >= HIGH_TOXICITY_THRESHOLD)
    );
}

async function resolveReporterId(preferredReporterId) {
    if (preferredReporterId && Number.isInteger(preferredReporterId)) {
        return preferredReporterId;
    }

    const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
    });
    if (admin?.id) {
        return admin.id;
    }

    const user = await prisma.user.findFirst({
        select: { id: true },
        orderBy: { id: "asc" },
    });

    return user?.id ?? null;
}

function buildAutoFlagReason(analysis) {
    return "[AUTO-FLAGGED] Automatically flagged by AI moderation at creation time.";
}

export async function createAutoReportIfToxic({
    targetType,
    targetId,
    content,
    reporterId,
}) {
    const autoReason = "Automatically moderating newly created content.";
    const aiAnalysis = await getAiAnalysis(content, autoReason);

    if (!shouldAutoFlag(aiAnalysis)) {
        return { created: false, aiAnalysis };
    }

    const resolvedReporterId = await resolveReporterId(reporterId);
    if (!resolvedReporterId) {
        return { created: false, aiAnalysis, skipped: "No reporter account available" };
    }

    const report = await prisma.report.create({
        data: {
            reason: buildAutoFlagReason(aiAnalysis),
            reporterId: resolvedReporterId,
            threadId: targetType === "THREAD" ? targetId : null,
            postId: targetType === "POST" ? targetId : null,
            pollId: targetType === "POLL" ? targetId : null,
            status: "PENDING",
            aiVerdict: aiAnalysis?.verdict,
            aiExplanation: aiAnalysis?.explanation,
            toxicityScore: aiAnalysis?.toxicityScore,
        },
    });

    return { created: true, reportId: report.id, aiAnalysis };
}

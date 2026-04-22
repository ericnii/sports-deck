import { cookies } from "next/headers";
import ModerationDashboard from "./ModerationDashboard";
import { notFound } from "next/navigation";
import { prisma } from "@/prisma/db";
// @ts-expect-error
import jwt from "jsonwebtoken";

/*

Moderation
As a user, I want to report posts or threads that I find inappropriate, providing a reason for the report.
As an admin, I want the system to automatically flag potentially inappropriate comments for review, helping maintain a positive and respectful community.
As an admin, I want to view a queue of reported items for review, sorted by AI-generated verdicts and the number of user reports.
As an admin, I want to see an AI-generated verdict when reviewing a reported item, indicating whether the post is inappropriate. The verdict should include an explanation, such as a textual reason, toxicity score, or other relevant details, to assist in decision-making.
As an admin, I want to dismiss a report or approve it and hide the original content. This will make the original post, comment, or thread invisible to other users, and no further activity (reply, vote, edit) is allowed on that content by any user.
As an admin, I want to ban/unban users based on the submitted reports, preventing them from creating threads, participating in discussions, following new users, or voting in polls.
As a user, I want to submit an appeal request to unban myself. If this request is approved, the restrictions are lifted.

*/

export default async function ModerationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  // verifying if the user is an admin or not
  let dbUser = null;
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
    } catch (err) { }
  }

  // if the user is NOT an admin, show a 404 error to hide the fact that it is an endpoint for security reasons
  if (!dbUser || dbUser.role !== "ADMIN") {
    notFound();
  }

  return <div className="max-w-7xl mx-auto p-8">
    <ModerationDashboard />
  </div>;
}
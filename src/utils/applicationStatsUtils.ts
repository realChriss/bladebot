import { ButtonInteraction } from "discord.js";
import { application } from "@prisma/client";
import prisma from "../db/prisma";

type ApplicationStatus = "accepted" | "rejected" | "cancelled" | "deleted";

export async function logApplicationAction(
  application: application,
  status: ApplicationStatus,
  issuerId: string,
): Promise<void> {
  await prisma.application_stats.create({
    data: {
      application_id: application.msg_id,
      user_id: application.user_id,
      status: status,
      age: application.age,
      kill_count: application.kill,
      win_count: application.win,
      processed_by: issuerId,
      processed_at: new Date(),
      processing_time: Math.floor(
        Date.now() - application.created_at.getTime(),
      ),
    },
  });
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);

  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

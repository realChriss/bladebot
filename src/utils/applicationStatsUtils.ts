import { ButtonInteraction } from "discord.js";
import { application } from "@prisma/client";
import prisma from "../db/prisma";

type ApplicationStatus = 'accepted' | 'rejected' | 'cancelled' | 'deleted';

export async function logApplicationAction(
  interaction: ButtonInteraction,
  application: application,
  status: ApplicationStatus
): Promise<void> {
  await prisma.application_stats.create({
    data: {
      application_id: application.msg_id,
      user_id: application.user_id,
      status: status,
      age: application.age,
      kill_count: application.kill,
      win_count: application.win,
      processed_by: interaction.member?.user.id,
      processed_at: new Date(),
      processing_time: Math.floor((Date.now() - application.created_at.getTime()) / 60000)
    }
  });
}
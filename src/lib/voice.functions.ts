import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVoiceStatus, synthesize } from "./voice.server";

const speakSchema = z.object({
  text: z.string().min(1).max(600),
  voiceId: z.string().min(1).max(64),
});

export const checkVoiceStatus = createServerFn({ method: "GET" }).handler(async () =>
  getVoiceStatus(),
);

export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => speakSchema.parse(data))
  .handler(async ({ data }) => synthesize(data));

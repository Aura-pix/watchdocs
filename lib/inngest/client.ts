import { Inngest } from "inngest";

const devEnv = process.env.INNGEST_DEV;
const isDev =
  devEnv === "1" ||
  devEnv === "true" ||
  (!devEnv && process.env.NODE_ENV !== "production");

export const inngest = new Inngest({ id: "watchdocs", isDev });

export const PUSH_EVENT = "watchdocs/push" as const;
export const INSTALLATION_SYNC_EVENT = "watchdocs/installation.sync" as const;

export interface InstallationSyncJobData {
  kind: "installation" | "installation_repositories";
  action: string;
  installationId: number;
  senderId: number;
  senderLogin: string;
}

import { ensureUser } from "@/lib/app/users";
import {
  setInstallationStatus,
  syncInstallationById,
} from "@/lib/github/installations";
import type { PushPipelineInput } from "@/lib/pipeline/push";
import { runPushPipeline } from "@/lib/pipeline/push";
import {
  inngest,
  INSTALLATION_SYNC_EVENT,
  PUSH_EVENT,
  type InstallationSyncJobData,
} from "./client";

export const processPush = inngest.createFunction(
  {
    id: "watchdocs-process-push",
    retries: 2,
    triggers: [{ event: PUSH_EVENT }],
  },
  async ({ event, step }) => {
    const data = event.data as unknown as PushPipelineInput;
    return step.run("run-push-pipeline", () => runPushPipeline(data));
  },
);

export const syncInstallation = inngest.createFunction(
  {
    id: "watchdocs-sync-installation",
    retries: 3,
    triggers: [{ event: INSTALLATION_SYNC_EVENT }],
  },
  async ({ event, step }) => {
    const data = event.data as unknown as InstallationSyncJobData;

    return step.run("sync-installation", async () => {
      if (data.action === "deleted") {
        await setInstallationStatus(data.installationId, "removed");
        return { status: "removed" };
      }

      if (data.action === "suspend") {
        await setInstallationStatus(data.installationId, "suspended");
        return { status: "suspended" };
      }

      if (data.action === "unsuspend") {
        await setInstallationStatus(data.installationId, "active");
        return { status: "active" };
      }

      const user = await ensureUser({
        githubId: String(data.senderId),
        login: data.senderLogin,
      });

      const synced = await syncInstallationById(
        data.installationId,
        user?.id ?? null,
      );

      return {
        status: "synced",
        repoCount: synced.repoCount,
      };
    });
  },
);

export const functions = [processPush, syncInstallation];

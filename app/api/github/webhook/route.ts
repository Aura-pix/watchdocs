import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { installations, repos, webhookDeliveries } from "@/lib/db/schema";
import { updateRunStatusForPullRequest } from "@/lib/app/runs";
import {
  INSTALLATION_SYNC_EVENT,
  PUSH_EVENT,
  inngest,
} from "@/lib/inngest/client";
import {
  isBotSender,
  isDefaultBranchPush,
  isWatchdocsBranch,
  verifyGitHubSignature,
  type InstallationRepositoriesWebhookPayload,
  type InstallationWebhookPayload,
  type PullRequestWebhookPayload,
  type PushWebhookPayload,
} from "@/lib/github/webhook";

function json(body: unknown, status = 202): NextResponse {
  return NextResponse.json(body, { status });
}

async function handlePush(payload: PushWebhookPayload, deliveryId: string) {
  const installationId = payload.installation?.id;
  if (!installationId) return { ignored: "missing installation" };
  if (payload.deleted) return { ignored: "branch deleted" };
  if (isBotSender(payload.sender)) return { ignored: "bot sender" };
  if (isWatchdocsBranch(payload.ref)) return { ignored: "watchdocs branch" };
  if (!payload.after) return { ignored: "missing head commit" };

  const db = getDb();
  const [installation] = await db
    .select({ id: installations.id })
    .from(installations)
    .where(
      eq(installations.githubInstallationId, String(installationId)),
    )
    .limit(1);

  if (!installation) return { ignored: "installation not connected" };

  const [repo] = await db
    .select({
      id: repos.id,
      enabled: repos.enabled,
      defaultBranch: repos.defaultBranch,
    })
    .from(repos)
    .where(
      and(
        eq(repos.installationId, installation.id),
        eq(repos.githubRepoId, String(payload.repository.id)),
      ),
    )
    .limit(1);

  if (!repo) return { ignored: "repository not connected" };
  if (!repo.enabled) return { ignored: "repository paused" };
  if (!isDefaultBranchPush(payload.ref, repo.defaultBranch)) {
    return { ignored: "not the default branch" };
  }

  await inngest.send({
    name: PUSH_EVENT,
    data: {
      deliveryId,
      repoId: repo.id,
      installationId,
      before: payload.before,
      after: payload.after,
      ref: payload.ref,
      commitMessage: payload.head_commit?.message ?? "API change",
      authorName:
        payload.head_commit?.author.name ?? payload.sender.login,
      authorEmail: payload.head_commit?.author.email ?? "",
      authorLogin:
        payload.head_commit?.author.username ?? payload.sender.login,
      senderLogin: payload.sender.login,
    },
  });

  return { queued: "push" };
}

async function handleInstallation(payload: InstallationWebhookPayload) {
  const installationId = payload.installation?.id;
  if (!installationId) return { ignored: "missing installation" };

  await inngest.send({
    name: INSTALLATION_SYNC_EVENT,
    data: {
      kind: "installation",
      action: payload.action,
      installationId,
      senderId: payload.sender.id,
      senderLogin: payload.sender.login,
    },
  });

  return { queued: "installation" };
}

async function handleInstallationRepositories(
  payload: InstallationRepositoriesWebhookPayload,
) {
  const installationId = payload.installation?.id;
  if (!installationId) return { ignored: "missing installation" };

  await inngest.send({
    name: INSTALLATION_SYNC_EVENT,
    data: {
      kind: "installation_repositories",
      action: payload.action,
      installationId,
      senderId: payload.sender.id,
      senderLogin: payload.sender.login,
    },
  });

  return { queued: "installation_repositories" };
}

async function handlePullRequest(payload: PullRequestWebhookPayload) {
  if (payload.action !== "closed") return { ignored: "not a close event" };
  if (!payload.pull_request.head.ref.startsWith("watchdocs/")) {
    return { ignored: "not a Watchdocs pull request" };
  }

  const installationId = payload.installation?.id;
  if (!installationId) return { ignored: "missing installation" };

  const db = getDb();
  const [installation] = await db
    .select({ id: installations.id })
    .from(installations)
    .where(eq(installations.githubInstallationId, String(installationId)))
    .limit(1);

  if (!installation) return { ignored: "installation not connected" };

  const [repo] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(
      and(
        eq(repos.installationId, installation.id),
        eq(repos.githubRepoId, String(payload.repository.id)),
      ),
    )
    .limit(1);

  if (!repo) return { ignored: "repository not connected" };

  await updateRunStatusForPullRequest({
    repoId: repo.id,
    prNumber: payload.pull_request.number,
    status: payload.pull_request.merged ? "merged" : "closed",
  });

  return { updated: "run" };
}

async function dispatch(
  event: string,
  payload: unknown,
  deliveryId: string,
) {
  if (event === "push") {
    return handlePush(payload as PushWebhookPayload, deliveryId);
  }
  if (event === "installation") {
    return handleInstallation(payload as InstallationWebhookPayload);
  }
  if (event === "installation_repositories") {
    return handleInstallationRepositories(
      payload as InstallationRepositoriesWebhookPayload,
    );
  }
  if (event === "pull_request") {
    return handlePullRequest(payload as PullRequestWebhookPayload);
  }
  return { ignored: `unhandled event: ${event}` };
}

export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: "GITHUB_WEBHOOK_SECRET is not configured." }, 503);
  }

  if (!isDbConfigured()) {
    return json({ error: "DATABASE_URL is not configured." }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyGitHubSignature(rawBody, signature, secret)) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");

  if (!deliveryId || !event) {
    return json({ error: "Missing GitHub delivery headers." }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const db = getDb();
  const inserted = await db
    .insert(webhookDeliveries)
    .values({ deliveryId })
    .onConflictDoNothing()
    .returning({ deliveryId: webhookDeliveries.deliveryId });

  if (inserted.length === 0) {
    return json({ ok: true, duplicate: true });
  }

  try {
    const outcome = await dispatch(event, payload, deliveryId);
    return json({ ok: true, ...outcome });
  } catch (error) {
    await db
      .delete(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    console.error("GitHub webhook failed:", error);
    return json({ error: "Webhook processing failed." }, 500);
  }
}

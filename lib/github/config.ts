export function isGitHubAppConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      (process.env.GITHUB_APP_PRIVATE_KEY ||
        process.env.GITHUB_APP_PRIVATE_KEY_BASE64),
  );
}

export function getAppId(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("GITHUB_APP_ID is not set.");
  }
  return appId;
}

export function getPrivateKey(): string {
  const base64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
  if (base64) {
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_BASE64 is not set.",
    );
  }

  return raw.replace(/\\n/g, "\n");
}

export function getInstallUrl(): string | null {
  const explicit =
    process.env.GITHUB_APP_INSTALL_URL ??
    process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL;
  if (explicit) return explicit;

  const slug = process.env.GITHUB_APP_SLUG;
  return slug ? `https://github.com/apps/${slug}/installations/new` : null;
}

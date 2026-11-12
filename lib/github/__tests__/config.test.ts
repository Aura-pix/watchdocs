import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInstallUrl,
  getPrivateKey,
  isGitHubAppConfigured,
} from "../config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GitHub App config", () => {
  it("builds the install URL from the app slug", () => {
    vi.stubEnv("GITHUB_APP_INSTALL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_GITHUB_APP_INSTALL_URL", "");
    vi.stubEnv("GITHUB_APP_SLUG", "watchdocs");
    expect(getInstallUrl()).toBe(
      "https://github.com/apps/watchdocs/installations/new",
    );
  });

  it("prefers an explicit install URL", () => {
    vi.stubEnv("GITHUB_APP_INSTALL_URL", "https://example.com/install");
    vi.stubEnv("GITHUB_APP_SLUG", "watchdocs");
    expect(getInstallUrl()).toBe("https://example.com/install");
  });

  it("returns null without a slug or URL", () => {
    vi.stubEnv("GITHUB_APP_INSTALL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_GITHUB_APP_INSTALL_URL", "");
    vi.stubEnv("GITHUB_APP_SLUG", "");
    expect(getInstallUrl()).toBeNull();
  });

  it("decodes a base64 private key", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n";
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_BASE64", Buffer.from(pem).toString("base64"));
    expect(getPrivateKey()).toBe(pem);
  });

  it("restores escaped newlines in a raw private key", () => {
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_BASE64", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "line1\\nline2");
    expect(getPrivateKey()).toBe("line1\nline2");
  });

  it("requires an id and a key", () => {
    vi.stubEnv("GITHUB_APP_ID", "1");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY_BASE64", "");
    expect(isGitHubAppConfigured()).toBe(false);

    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "key");
    expect(isGitHubAppConfigured()).toBe(true);
  });
});

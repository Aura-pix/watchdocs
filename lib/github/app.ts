import { App, Octokit } from "octokit";
import { getAppId, getPrivateKey } from "./config";

let appInstance: App | null = null;

export function getApp(): App {
  if (!appInstance) {
    appInstance = new App({
      appId: getAppId(),
      privateKey: getPrivateKey(),
    });
  }
  return appInstance;
}

export async function userHasInstallation(
  accessToken: string,
  installationId: number,
): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken });

  for (let page = 1; page <= 10; page += 1) {
    const { data } =
      await octokit.rest.apps.listInstallationsForAuthenticatedUser({
        per_page: 100,
        page,
      });

    if (
      data.installations.some(
        (installation) => installation.id === installationId,
      )
    ) {
      return true;
    }

    if (data.installations.length < 100) return false;
  }

  return false;
}

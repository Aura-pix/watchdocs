import type { WatchdocsConfig } from "@/lib/engine/types";

export interface RepoConfigOverrides {
  watchedPaths: string[];
  docsPaths: string[];
  branchPrefix: string;
  prLabels: string[];
}

export function applyRepoOverrides(
  config: WatchdocsConfig,
  repo: RepoConfigOverrides,
): WatchdocsConfig {
  return {
    ...config,
    watch: {
      ...config.watch,
      routes:
        repo.watchedPaths.length > 0
          ? repo.watchedPaths
          : config.watch.routes,
    },
    docs: {
      ...config.docs,
      paths: repo.docsPaths.length > 0 ? repo.docsPaths : config.docs.paths,
    },
    pr: {
      ...config.pr,
      branchPrefix: repo.branchPrefix || config.pr.branchPrefix,
      labels: repo.prLabels.length > 0 ? repo.prLabels : config.pr.labels,
    },
  };
}

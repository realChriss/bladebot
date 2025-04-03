import path from "path";
import Logger from "./Logger";

let cachedBuildVersion: BuildVersion | null = null;

export function getBuildVersion(): BuildVersion | null {
  if (cachedBuildVersion) {
    return cachedBuildVersion;
  }

  const buildInfoPath = path.join(__dirname, "..", "build.json");
  try {
    const buildInfo = require(buildInfoPath);

    cachedBuildVersion = {
      branch: buildInfo.branchName,
      commit: buildInfo.commitHash,
    };
  } catch (error) {
    Logger.warn(`Could not read build commit hash from file: ${error}`);
    cachedBuildVersion = null;
  }

  return cachedBuildVersion;
}

getBuildVersion();
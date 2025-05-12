import { env } from "./env";
import { getBuildVersion } from "./utils/buildInfo";
import Logger from "./utils/Logger";

function initEnv() {
  const buildVersion = getBuildVersion();
  Logger.info(
    `Running in ${env.STATE === "prod" ? "production" : "development"} mode ${buildVersion ? `at \`${buildVersion.branch} / ${buildVersion.commit}\`` : ""}`,
  );
}

function initHandlers() {
  process.on("uncaughtException", function (err) {
    const text = "Caught exception: " + err + "\n" + err.stack;
    Logger.error(text);
  });

  process.on("SIGTERM", () => {
    process.exit(0);
  });
}

function startClient() {
  require("./bot/run");
}

function main() {
  initEnv();
  initHandlers();
  startClient();
}
main();

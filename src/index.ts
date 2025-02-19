import Logger from "./utils/Logger";

function initEnv() {
  process.env.STATE ??= "dev";
  Logger.info(
    `Running in ${process.env.STATE === "prod" ? "production" : "development"} mode`,
  );
}

function initLogger() {
  Logger.setLogLevel("ERROR");
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
  initLogger();
  initHandlers();
  startClient();
}
main();

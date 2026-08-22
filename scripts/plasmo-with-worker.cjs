const { spawn } = require("node:child_process");
const { copyWorker } = require("./copy-pdf-worker-to-build.cjs");

const command = process.argv[2] === "build" ? "build" : "dev";
const child = spawn("npx", ["plasmo", command], {
  stdio: "inherit",
  shell: true
});

const timer = setInterval(() => {
  copyWorker();
}, 1000);

function finish(code) {
  clearInterval(timer);
  copyWorker();
  process.exit(code ?? 0);
}

child.on("exit", finish);
child.on("error", () => finish(1));

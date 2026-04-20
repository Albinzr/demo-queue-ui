/**
 * PM2 — static UI with `serve` (same intent as):
 *   pm2 start serve --name demo-q --watch -- ./demo-queue-ui/dist/ -l 60001 -s
 *
 * Do NOT use `pm2 start serve` directly: PM2 require()s the script, and current
 * `serve` is ESM-only → ERR_REQUIRE_ESM. Spawning `npx serve` avoids that.
 *
 * Set cwd to the directory where `./demo-queue-ui/dist` exists (often the parent
 * of the `demo-queue-ui` checkout). Override paths with env if needed:
 *   DEMO_Q_CWD=/path/to/parent DEMO_Q_STATIC=./demo-queue-ui/dist DEMO_Q_PORT=60001 pm2 start ecosystem.config.cjs
 *
 * Build first: `npm run build` (or copy dist into demo-queue-ui/dist).
 */
const cwd = process.env.DEMO_Q_CWD || __dirname;
const staticDir = process.env.DEMO_Q_STATIC || "./demo-queue-ui/dist";
const port = process.env.DEMO_Q_PORT || "60001";

module.exports = {
  apps: [
    {
      name: "demo-q",
      cwd,
      script: "bash",
      args: ["-c", `exec npx --yes serve -s "${staticDir}" -l ${port}`],
      instances: 1,
      autorestart: true,
      watch: [staticDir],
      ignore_watch: ["**/node_modules/**"],
      watch_options: {
        followSymlinks: false,
      },
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

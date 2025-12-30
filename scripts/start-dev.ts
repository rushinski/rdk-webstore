import { spawn, execSync, ChildProcess } from "child_process";
import pc from "picocolors";

const URL_APP = "https://localhost:8443";
const URL_STUDIO = "http://127.0.0.1:54323";
const URL_MAILPIT = "http://127.0.0.1:54324";

function section(title: string) {
  console.log(pc.bold(pc.cyan(`\n=== ${title} ===`)));
}

function info(msg: string) {
  console.log(pc.blue("• ") + msg);
}

function success(msg: string) {
  console.log(pc.green("✓ ") + msg);
}

function warn(msg: string) {
  console.log(pc.yellow("! ") + msg);
}

function errorLog(msg: string) {
  console.log(pc.red("✗ " + msg));
}

function startPrefixedProcess(
  label: string,
  command: string,
  args: string[]
): ChildProcess {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(
      pc.green(`[${label}] `) + data.toString()
    );
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(
      pc.red(`[${label}] `) + data.toString()
    );
  });

  child.on("exit", (code) => {
    if (code === 0) {
      warn(`${label} exited with code 0 (stopped)`);
    } else {
      errorLog(`${label} exited with code ${code}`);
    }
  });

  return child;
}

async function cleanStaleSupabase() {
  section("Cleaning stale Supabase containers");

  let list: string;
  try {
    list = execSync(`docker ps -a --format "{{.Names}}"`).toString();
  } catch {
    warn("Docker not running or not reachable. Skipping stale container cleanup.");
    return;
  }

  const containers = list
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.startsWith("supabase_"));

  if (containers.length === 0) {
    success("No stale Supabase containers found.");
    return;
  }

  warn(`Found ${containers.length} Supabase containers. Removing...`);
  for (const c of containers) {
    if (!c) continue;
    try {
      execSync(`docker rm -f ${c}`, { stdio: "ignore" });
      info(`Removed: ${c}`);
    } catch {
      warn(`Failed to remove ${c}`);
    }
  }
}

async function stopCaddy() {
  section("Ensuring Caddy is not running");

  try {
    execSync(`caddy stop`, { stdio: "ignore" });
    success("Caddy stopped via 'caddy stop'.");
  } catch {
    info("Caddy not running or 'caddy stop' failed (ignored).");
  }

  try {
    execSync(`taskkill /IM caddy.exe /F`, { stdio: "ignore" });
    success("Caddy process killed if it was running.");
  } catch {
    info("No caddy.exe process found.");
  }
}

async function startSupabase() {
  section("Starting Supabase (this may take ~30s)");

  return new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["supabase", "start"]);

    child.stdout.on("data", (data) => {
      const line = data.toString();

      // Hide secret-related lines from Supabase CLI
      if (
        line.includes("Secret") ||
        line.includes("Key") ||
        line.includes("Publishable") ||
        line.match(/sb_[a-zA-Z0-9_-]+/) ||
        line.includes("Storage (S3)") ||
        line.includes("Authentication Keys")
      ) {
        return;
      }

      process.stdout.write(pc.gray(line));
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(pc.red(data.toString()));
    });

    child.on("close", (code) => {
      if (code === 0) {
        success("Supabase is ready!");
        resolve();
      } else {
        errorLog(`Supabase exited with code ${code}`);
        reject(new Error(`Supabase exited with code ${code}`));
      }
    });
  });
}

async function startCaddyAndNext() {
  section("Starting Caddy + Next.js");

  // These behave exactly like:
  //   npm run caddy:start
  //   npm run dev
  // So Next.js will log all requests as usual.
  startPrefixedProcess("CADDY", "npm", ["run", "caddy:start"]);
  startPrefixedProcess("NEXT", "npm", ["run", "dev"]);
}

async function main() {
  console.clear();
  console.log(
    pc.bold(pc.magenta("Real Deal Kickz • Local Dev Environment"))
  );
  console.log(pc.dim(`App URL: ${URL_APP}\n`));

  await stopCaddy();
  await cleanStaleSupabase();

  try {
    await startSupabase();
  } catch (err) {
    errorLog("Supabase failed to start.");
    console.error(err);
    process.exit(1);
  }

  await startCaddyAndNext();

  // Only show the URLs ONCE everything has started
  section("All services started");
  success(`App:        ${URL_APP}`);
  success(`Studio:     ${URL_STUDIO}`);
  success(`MailPit:    ${URL_MAILPIT}\n`);

  // From here, script stays alive streaming logs
  // Stop everything with Ctrl+C in this terminal
}

main().catch((err) => {
  errorLog("Fatal error in dev startup script.");
  console.error(err);
  process.exit(1);
});

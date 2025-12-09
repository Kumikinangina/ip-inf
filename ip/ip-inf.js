#!/usr/bin/env node

import fetch from "node-fetch";
import readline from "readline";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import figlet from "figlet";
import gradient from "gradient-string";
import chalk from "chalk";
import ora from "ora";

const exec = promisify(execCb);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
function escapeShellArg(s) {
  if (typeof s !== "string") s = String(s);
  return `'${s.replace(/'/g, "'\"'\"'")}'`;
}

async function startupSequence() {
  console.clear();
  const steps = [
    "Initializing system modules...",
    "Establishing secure connection...",
    "Loading stealth assets...",
    "System ready."
  ];
  for (const step of steps) {
    const spinner = ora({ text: chalk.green(step), spinner: "dots" }).start();
    await sleep(650);
    spinner.succeed(chalk.greenBright(step));
  }
  await sleep(450);
  console.clear();
}

// banner
function printBanner() {
  let text;
  try { text = figlet.textSync("IP INFO", { font: "Standard" }); }
  catch { text = "IP SCANNER"; }
  console.log(gradient(["#00FF41", "#00A86B"])(text));
  console.log(chalk.gray("   ── stealth mode engaged · cli ip lookup ──\n"));
}



function buildGoogleMapsExactLink(loc, zoom = 12) {
  if (!loc) return null;
  const [lat, lon] = loc.split(",").map(s => s.trim());
  if (!lat || !lon) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}&zoom=${encodeURIComponent(String(zoom))}`;
}

async function tryOpenUrl(url) {
  if (!url) throw new Error("No URL provided");
  const isTermux = !!process.env.TERMUX_VERSION;
  const platform = process.platform;

  const attempts = [];
  if (isTermux) attempts.push(`termux-open-url ${escapeShellArg(url)}`);
  if (platform === "darwin") attempts.push(`open ${escapeShellArg(url)}`);
  if (platform === "win32") attempts.push(`cmd /c start "" ${escapeShellArg(url)}`);
  attempts.push(`xdg-open ${escapeShellArg(url)}`); // Linux fallback

  for (const cmd of attempts) {
    try {
      await exec(cmd);
      return true;
    } catch (e) {
    }
  }
  return false;
}

// main
(async () => {
  try {
    await startupSequence();
    printBanner();

    const ipInput = await ask(chalk.cyan("Enter IP address (leave empty to use your own): "));
    const ip = (ipInput || "").trim();

    const data = await fetchIpInfo(ip);
    printInfoBox(data);

    const mapsLink = buildGoogleMapsExactLink(data.loc || "");
    if (mapsLink) {
      console.log(chalk.green("🌍 Exact location (Google Maps):"), chalk.underline.bold(mapsLink));
      const openAns = await ask(chalk.yellow("Open exact location in browser/app now? (Y/n): "));
      const norm = (openAns || "").trim().toLowerCase();
      if (norm === "" || norm === "y" || norm === "yes") {
        const opened = await tryOpenUrl(mapsLink);
        if (opened) {
          console.log(chalk.green("Opened the exact location in your default browser/app."));
        } else {
          console.log(chalk.red("Couldn't automatically open the link. Copy the URL above and paste it in your browser."));
        }
      } else {
        console.log(chalk.gray("Okay — not opening the map. You can copy the link above anytime."));
      }
    } else {
      console.log(chalk.red("No coordinate data available for this IP — cannot build exact map link."));
    }

    console.log(chalk.gray("\n[✔] Process complete. Press Ctrl+C to exit if needed.\n"));
  } catch (err) {
    console.error(chalk.red("Error:"), err.message || err);
  }
})();
                                       

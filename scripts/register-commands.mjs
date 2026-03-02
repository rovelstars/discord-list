#!/usr/bin/env node
/**
 * register-commands.mjs — Discord slash-command registration
 *
 * Registers all slash commands defined in src/bot/register.ts with Discord's
 * API via the REST client.  Run this once after adding or changing commands.
 *
 * Usage
 * ─────
 *   node scripts/register-commands.mjs
 *   # or via package.json script:
 *   bun run register
 *
 * Behaviour
 * ─────────
 * • MODE=development  → registers commands as guild commands on DISCORD_GUILD_ID
 *   (instant propagation, great for testing)
 * • MODE=production   → registers commands globally (can take up to 1 hour to
 *   propagate to all Discord clients)
 *
 * Required environment variables
 * ───────────────────────────────
 *   DISCORD_TOKEN     — bot token
 *   DISCORD_BOT_ID    — application / client id
 *   DISCORD_GUILD_ID  — guild id (only required when MODE=development)
 *   MODE              — "development" | "production"  (defaults to "development")
 *
 * The script loads these from a .env file in the project root if present.
 * CI/CD pipelines can set them directly in the environment instead.
 *
 * Exit codes
 * ──────────
 *   0 — all commands registered successfully
 *   1 — missing required env var or Discord API error
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers (no deps — pure ANSI)
// ─────────────────────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY;

const c = {
	reset: isTTY ? "\x1b[0m" : "",
	bold: isTTY ? "\x1b[1m" : "",
	dim: isTTY ? "\x1b[2m" : "",
	green: isTTY ? "\x1b[32m" : "",
	yellow: isTTY ? "\x1b[33m" : "",
	red: isTTY ? "\x1b[31m" : "",
	cyan: isTTY ? "\x1b[36m" : "",
	blue: isTTY ? "\x1b[34m" : "",
	pink: isTTY ? "\x1b[35m" : ""
};

const log = (msg) => console.log(`${c.blue}[register]${c.reset} ${msg}`);
const ok = (msg) => console.log(`${c.green}[register]${c.reset} ${msg}`);
const info = (msg) => console.log(`${c.cyan}[register]${c.reset} ${msg}`);
const warn = (msg) => console.warn(`${c.yellow}[register]${c.reset} ${msg}`);
const fail = (msg) => console.error(`${c.red}[register]${c.reset} ${msg}`);
const section = (msg) => console.log(`\n${c.bold}${c.blue}── ${msg} ──${c.reset}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// .env loader  (no third-party dotenv needed)
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
	const envPath = resolve(__dirname, "../.env");
	if (!existsSync(envPath)) {
		warn(".env file not found — relying on shell environment variables only.");
		return;
	}

	const lines = readFileSync(envPath, "utf8").split("\n");
	let loaded = 0;

	for (const line of lines) {
		const trimmed = line.trim();
		// Skip blank lines and comments
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;

		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();

		// Strip surrounding quotes (single or double)
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}

		// Don't overwrite variables already set in the shell environment
		if (!(key in process.env)) {
			process.env[key] = val;
			loaded++;
		}
	}

	info(`Loaded ${loaded} variable(s) from .env`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

function requireEnv(name) {
	const val = process.env[name]?.trim();
	if (!val) {
		fail(`Required environment variable ${c.bold}${name}${c.reset}${c.red} is not set.`);
		exit(1);
	}
	return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command definitions
// Imported dynamically so this script stays a plain .mjs file while still
// reusing the same command data used by the bot at runtime.  We call the
// Discord REST API directly rather than importing the TS source to avoid
// needing a full TypeScript compile step here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a minimal representation of every slash command that should be
 * registered with Discord.  Mirrors the `commands` array exported from
 * src/bot/register.ts but expressed as plain JS objects so this script has
 * zero compile-time dependencies.
 *
 * IMPORTANT: Keep this list in sync with src/bot/register.ts whenever you
 * add, rename, or remove a command.
 */
function getCommandPayloads() {
	return [
		{
			name: "ping",
			description: "LET HIM COOK!",
			type: 1 // CHAT_INPUT
		},
		{
			name: "register",
			description: "Register this server on the Rovel Discord List.",
			type: 1, // CHAT_INPUT
			dm_permission: false,
			default_member_permissions: "32" // MANAGE_GUILD (0x20)
		}
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// Discord REST helpers  (no @discordjs/rest needed — plain fetch)
// ─────────────────────────────────────────────────────────────────────────────

const DISCORD_API = "https://discord.com/api/v10";

async function discordPut(path, body, token) {
	const res = await fetch(`${DISCORD_API}${path}`, {
		method: "PUT",
		headers: {
			Authorization: `Bot ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "discord-list/register-commands (+https://github.com)"
		},
		body: JSON.stringify(body)
	});

	const text = await res.text();

	if (!res.ok) {
		let detail = text;
		try {
			detail = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			/* raw text is fine */
		}
		throw new Error(`Discord API responded with HTTP ${res.status}:\n${detail}`);
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	section("Discord Command Registration");

	// 1. Load environment
	loadEnv();

	const token = requireEnv("DISCORD_TOKEN");
	const appId = requireEnv("DISCORD_BOT_ID");
	const mode = (process.env.MODE ?? "development").trim().toLowerCase();
	const isGuild = mode === "development";

	if (isGuild && !process.env.DISCORD_GUILD_ID?.trim()) {
		fail(
			`${c.bold}DISCORD_GUILD_ID${c.reset}${c.red} is required when MODE=development ` +
				`(guild commands need a target guild).`
		);
		exit(1);
	}

	const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";

	// 2. Build command list
	const commands = getCommandPayloads();

	if (commands.length === 0) {
		warn("No commands defined — nothing to register.");
		exit(0);
	}

	log(
		`Found ${c.bold}${commands.length}${c.reset} command(s): ${commands.map((cmd) => c.cyan + cmd.name + c.reset).join(", ")}`
	);
	log(
		`Mode: ${c.bold}${mode}${c.reset} → registering ${isGuild ? `as ${c.pink}guild${c.reset} commands on guild ${c.bold}${guildId}${c.reset}` : `${c.pink}globally${c.reset}`}`
	);

	// 3. Register
	const path = isGuild
		? `/applications/${appId}/guilds/${guildId}/commands`
		: `/applications/${appId}/commands`;

	log(`Calling Discord API: PUT ${path} …`);

	let registered;
	try {
		registered = await discordPut(path, commands, token);
	} catch (err) {
		fail(`Registration failed: ${err.message}`);
		exit(1);
	}

	// 4. Report
	const names = Array.isArray(registered)
		? registered
				.map((cmd) => `${c.cyan}${cmd.name}${c.reset} (id: ${c.dim}${cmd.id}${c.reset})`)
				.join("\n    ")
		: "(no list returned)";

	ok(
		`Successfully registered ${c.bold}${Array.isArray(registered) ? registered.length : "?"}${c.reset} command(s) ${isGuild ? `${c.pink}to guild ${guildId}` : `${c.pink}globally`}${c.reset}:`
	);
	ok(`    ${names}`);
}

main().catch((err) => {
	fail(`Unexpected error: ${err.stack ?? err.message ?? String(err)}`);
	exit(1);
});

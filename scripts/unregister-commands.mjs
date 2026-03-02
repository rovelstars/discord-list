#!/usr/bin/env node
/**
 * unregister-commands.mjs — Discord slash-command unregistration
 *
 * Fetches all currently registered commands from Discord and deletes them
 * one-by-one.  Useful for cleaning up stale or renamed commands, or wiping
 * the slate before a fresh registration run.
 *
 * Usage
 * ─────
 *   node scripts/unregister-commands.mjs
 *   # or via package.json script:
 *   bun run unregister
 *
 * Scope flags (mutually exclusive, default: --both)
 * ─────────────────────────────────────────────────
 *   --global   delete only globally registered commands
 *   --guild    delete only guild-scoped commands for DISCORD_GUILD_ID
 *   --both     delete both global and guild commands (default)
 *
 * Required environment variables
 * ───────────────────────────────
 *   DISCORD_TOKEN     — bot token
 *   DISCORD_BOT_ID    — application / client id
 *   DISCORD_GUILD_ID  — guild id (required when scope includes guild commands)
 *
 * The script loads these from a .env file in the project root if present.
 * CI/CD pipelines can set them directly in the environment instead.
 *
 * Exit codes
 * ──────────
 *   0 — all targeted commands deleted successfully (or none existed)
 *   1 — missing required env var or Discord API error
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exit } from 'node:process';

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers (no deps — pure ANSI)
// ─────────────────────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY;

const c = {
	reset:  isTTY ? '\x1b[0m'  : '',
	bold:   isTTY ? '\x1b[1m'  : '',
	dim:    isTTY ? '\x1b[2m'  : '',
	green:  isTTY ? '\x1b[32m' : '',
	yellow: isTTY ? '\x1b[33m' : '',
	red:    isTTY ? '\x1b[31m' : '',
	cyan:   isTTY ? '\x1b[36m' : '',
	blue:   isTTY ? '\x1b[34m' : '',
	pink:   isTTY ? '\x1b[35m' : '',
};

const log     = (msg) => console.log(`${c.blue}[unregister]${c.reset} ${msg}`);
const ok      = (msg) => console.log(`${c.green}[unregister]${c.reset} ${msg}`);
const info    = (msg) => console.log(`${c.cyan}[unregister]${c.reset} ${msg}`);
const warn    = (msg) => console.warn(`${c.yellow}[unregister]${c.reset} ${msg}`);
const fail    = (msg) => console.error(`${c.red}[unregister]${c.reset} ${msg}`);
const section = (msg) => console.log(`\n${c.bold}${c.blue}── ${msg} ──${c.reset}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// .env loader  (no third-party dotenv needed)
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
	const envPath = resolve(__dirname, '../.env');
	if (!existsSync(envPath)) {
		warn('.env file not found — relying on shell environment variables only.');
		return;
	}

	const lines = readFileSync(envPath, 'utf8').split('\n');
	let loaded = 0;

	for (const line of lines) {
		const trimmed = line.trim();
		// Skip blank lines and comments
		if (!trimmed || trimmed.startsWith('#')) continue;

		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;

		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();

		// Strip surrounding quotes (single or double)
		if ((val.startsWith('"') && val.endsWith('"')) ||
		    (val.startsWith("'") && val.endsWith("'"))) {
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
// CLI flag parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseScope() {
	const args = process.argv.slice(2);
	if (args.includes('--global')) return 'global';
	if (args.includes('--guild'))  return 'guild';
	return 'both'; // default
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
// Discord REST helpers  (no @discordjs/rest needed — plain fetch)
// ─────────────────────────────────────────────────────────────────────────────

const DISCORD_API = 'https://discord.com/api/v10';

const baseHeaders = (token) => ({
	Authorization: `Bot ${token}`,
	'Content-Type': 'application/json',
	'User-Agent': 'discord-list/unregister-commands (+https://github.com)',
});

async function discordGet(path, token) {
	const res = await fetch(`${DISCORD_API}${path}`, {
		method: 'GET',
		headers: baseHeaders(token),
	});

	const text = await res.text();

	if (!res.ok) {
		let detail = text;
		try { detail = JSON.stringify(JSON.parse(text), null, 2); } catch { /* raw text is fine */ }
		throw new Error(`Discord API GET ${path} responded with HTTP ${res.status}:\n${detail}`);
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function discordDelete(path, token) {
	const res = await fetch(`${DISCORD_API}${path}`, {
		method: 'DELETE',
		headers: baseHeaders(token),
	});

	// 204 No Content is the success response for DELETE
	if (res.status === 204 || res.ok) return;

	const text = await res.text();
	let detail = text;
	try { detail = JSON.stringify(JSON.parse(text), null, 2); } catch { /* raw text is fine */ }
	throw new Error(`Discord API DELETE ${path} responded with HTTP ${res.status}:\n${detail}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core unregistration logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch and delete all commands at the given list/delete path pair.
 *
 * @param {string}   label      - human-readable scope label ("global" | "guild …")
 * @param {string}   listPath   - GET path that returns the command array
 * @param {Function} deletePath - fn(commandId) => DELETE path for a single command
 * @param {string}   token      - bot token
 * @returns {{ deleted: number, failed: number }}
 */
async function unregisterScope(label, listPath, deletePath, token) {
	log(`Fetching ${c.bold}${label}${c.reset} commands from Discord …`);

	let commands;
	try {
		commands = await discordGet(listPath, token);
	} catch (err) {
		fail(`Failed to fetch ${label} commands: ${err.message}`);
		exit(1);
	}

	if (!Array.isArray(commands) || commands.length === 0) {
		info(`No ${label} commands found — nothing to delete.`);
		return { deleted: 0, failed: 0 };
	}

	log(`Found ${c.bold}${commands.length}${c.reset} ${label} command(s): ${commands.map(cmd => `${c.cyan}${cmd.name}${c.reset}${c.dim}(${cmd.id})${c.reset}`).join(', ')}`);

	let deleted = 0;
	let failed  = 0;

	for (const cmd of commands) {
		try {
			await discordDelete(deletePath(cmd.id), token);
			ok(`  Deleted ${label} command ${c.cyan}${cmd.name}${c.reset} ${c.dim}(${cmd.id})${c.reset}`);
			deleted++;
		} catch (err) {
			fail(`  Failed to delete ${label} command ${c.cyan}${cmd.name}${c.reset}: ${err.message}`);
			failed++;
		}
	}

	return { deleted, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	section('Discord Command Unregistration');

	// 1. Load environment
	loadEnv();

	const token  = requireEnv('DISCORD_TOKEN');
	const appId  = requireEnv('DISCORD_BOT_ID');
	const scope  = parseScope();

	if ((scope === 'guild' || scope === 'both') && !process.env.DISCORD_GUILD_ID?.trim()) {
		fail(
			`${c.bold}DISCORD_GUILD_ID${c.reset}${c.red} is required when unregistering guild commands.` +
			` Pass ${c.bold}--global${c.reset}${c.red} to skip guild commands.`
		);
		exit(1);
	}

	const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? '';

	log(`Scope: ${c.bold}${scope}${c.reset}${scope !== 'global' ? ` (guild: ${c.pink}${guildId}${c.reset})` : ''}`);

	let totalDeleted = 0;
	let totalFailed  = 0;

	// 2. Delete global commands
	if (scope === 'global' || scope === 'both') {
		const { deleted, failed } = await unregisterScope(
			'global',
			`/applications/${appId}/commands`,
			(id) => `/applications/${appId}/commands/${id}`,
			token
		);
		totalDeleted += deleted;
		totalFailed  += failed;
	}

	// 3. Delete guild commands
	if (scope === 'guild' || scope === 'both') {
		const { deleted, failed } = await unregisterScope(
			`guild ${guildId}`,
			`/applications/${appId}/guilds/${guildId}/commands`,
			(id) => `/applications/${appId}/guilds/${guildId}/commands/${id}`,
			token
		);
		totalDeleted += deleted;
		totalFailed  += failed;
	}

	// 4. Final summary
	console.log('');
	if (totalFailed > 0) {
		warn(
			`Finished with ${c.bold}${totalDeleted}${c.reset}${c.yellow} deleted and ` +
			`${c.bold}${c.red}${totalFailed}${c.reset}${c.yellow} failed.`
		);
		exit(1);
	} else {
		ok(
			`Done — ${c.bold}${totalDeleted}${c.reset} command(s) successfully unregistered.`
		);
	}
}

main().catch((err) => {
	fail(`Unexpected error: ${err.stack ?? err.message ?? String(err)}`);
	exit(1);
});

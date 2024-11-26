import {
  InteractionResponseType,
  InteractionType,
  verifyKey
} from 'discord-interactions';
//import {Buffer} from "https://deno.land/std@0.110.0/node/buffer.ts";

import { commands, runs } from '@/bot/register';

import type { APIRoute } from 'astro';
import type { Env } from '@/lib/env';


declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: Env;
      };
    }
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const { env } = locals.runtime || import.meta;
  return new Response(`👋 ${env.DISCORD_BOT_ID}`);
}
export const POST: APIRoute = async ({ params, request, locals }) => {
  const { env } = locals.runtime || import.meta;
  try {
    if (env.DISCORD_PUBLIC_KEY === undefined) {
      return new Response("No public key found in env", { status: 500 });
    }
    const body = await request.clone().arrayBuffer();
    const signature = request.headers.get('x-signature-ed25519') || '';
    const timestamp = request.headers.get('x-signature-timestamp') || '';
    const valid =
      signature &&
      timestamp &&
      (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
    if (!valid) {
      return new Response('Invalid Request Signature', { status: 401 });
    }
    const interaction = await request.json();
    if (!interaction) {
      return new Response('Invalid Request Signature', { status: 401 });
    }
    if (interaction.type === InteractionType.PING) {
      console.log("%c[DISCORD] %cReceived %cPING", "color: #5865f2",
        "color: #fee75c", "color: #fee75c;font-weight: bold");
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), { headers: { 'Content-Type': 'application/json' } });
    } else if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      let cmd = commands.find(c => c.name.toLowerCase() ===
        interaction.data.name.toLowerCase());
      if (!cmd) {
        console.log("%c[DISCORD] %cCommand ran: %cUNKNOWN", "color: #5865f2",
          "color: #ed4245;", "color: #ed4245; font-weight: bold;");

        return new Response(JSON.stringify({ error: "Unknown Type" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      console.log("%c[DISCORD] %cReceived Command: %c" + cmd.name,
        "color: #5865f2", "color: #57f287;",
        "color: #57f287;font-weight: bold;");
      // get index of command
      let index = commands.indexOf(cmd);
      // get the function to run
      let run = runs[index];
      // run the function
      let response = await run(interaction, env as Env);
    } else {
      return new Response('Unknown Interaction Type');
    }
  } catch (e) {
    return new Response('Invalid Request Signature', { status: 401 });
  }
}

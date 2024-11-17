import {
  InteractionResponseType,
  InteractionType,
} from 'discord-interactions';
//import {Buffer} from "https://deno.land/std@0.110.0/node/buffer.ts";
import nacl from "tweetnacl";
import { commands, runs } from '@/bot/register';

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  return new Response(`👋 ${import.meta.env.DISCORD_BOT_ID}`);
}

export const POST: APIRoute = async ({ params, request }) => {
  try {
    if(import.meta.env.DISCORD_PUBLIC_KEY === undefined) {
      return new Response("No public key found in env", { status: 500 });
    }
    const body = await request.text();
    const message = JSON.parse(body);
    console.log(message);
    const signature = request.headers.get('x-signature-ed25519') || '';
    const timestamp = request.headers.get('x-signature-timestamp') || '';
    let valid = nacl.sign.detached.verify(
      Buffer.from(timestamp + body), Buffer.from(signature, 'hex'),
      Buffer.from(import.meta.env.DISCORD_PUBLIC_KEY, 'hex'));
    if (!valid) {

      return new Response('invalid request signature', { status: 401 });
    }
    if (message.type === InteractionType.PING) {
      console.log("%c[DISCORD] %cReceived %cPING", "color: #5865f2",
        "color: #fee75c", "color: #fee75c;font-weight: bold");
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), { headers: { 'Content-Type': 'application/json' } });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      let cmd = commands.find(c => c.name.toLowerCase() ===
        message.data.name.toLowerCase());
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
      let response = await run(message);
    } else {
      return new Response(JSON.stringify({ error: 'Unknown Interaction Type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.log("invalid!!");
    return new Response(JSON.stringify({ error: 'Invalid Request Signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
}

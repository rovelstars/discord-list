// Import all commands from the commands directory and export them as an array of data and run functions.

import ping from "./commands/ping";
import registerServer from "./commands/register-server";
import transfer from "./commands/transfer";
import bal from "./commands/bal";
import sync from "./commands/sync";

const commands = [ping.data, registerServer.data, transfer.data, bal.data, sync.data];
const commandFns = [ping.run, registerServer.run, transfer.run, bal.run, sync.run];

export { commands, commandFns };

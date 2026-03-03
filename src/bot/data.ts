// Import all commands from the commands directory and export them as an array of data and run functions.

import ping from "./commands/ping";
import registerServer from "./commands/register-server";

const commands = [ping.data, registerServer.data];
const commandFns = [ping.run, registerServer.run];

export { commands, commandFns };

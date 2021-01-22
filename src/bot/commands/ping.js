// <message>.channel.send(`Websocket heartbeat: ${<client>.ws.ping}ms.`);
module.exports = {
        name: 'ping',
        description: 'Ping!',
        cooldown: 10,
        execute(message) {
                message.channel.send(`>>> Websocket heartbeat: ${client.ws.ping} ms...`);
                message.channel.send('Pinging...').then(sent => {
    sent.edit(`>>> Roundtrip latency: ${sent.createdTimestamp - message.createdTimestamp}ms`);
});
        },
};
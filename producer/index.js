const amqp = require("amqplib");
const crypto = require("crypto");

const EXCHANGE = process.env?.EXCHANGE || "meaner";
const AMQP_URL = process.env?.AMQP_URL || "amqp://localhost";

(async function () {
  const connection = await amqp.connect(AMQP_URL);
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE);

  const interval = setInterval(() => {
    const temp = crypto.randomInt(50);
    console.log("PUBLISHING VALUE: temp: ", temp);
    channel.publish(EXCHANGE, "", Buffer.from(JSON.stringify({ temp })));
  }, 1000);

  process.on("SIGTERM", () => clearInterval(interval));

  console.log("CONNECTED TO AMQP");
})();

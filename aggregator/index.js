const amqp = require("amqplib");

const EXCHANGE = process.env?.EXCHANGE || "meaner";
const QUEUE = process.env?.QUEUE || "meanInput";
const AVG_EXCHANGE = process.env?.AVG_EXCHANGE || "tempMean";
const AMQP_URL = process.env?.AMQP_URL || "amqp://localhost";

(async function () {
  const connection = await amqp.connect(AMQP_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE);
  await channel.assertQueue(QUEUE);
  await channel.bindQueue(QUEUE, EXCHANGE, "");

  let runningMean = 0;
  let valueCount = 0;

  channel.consume(QUEUE, (msg) => {
    const { temp } = JSON.parse(msg.content.toString());

    console.log("GOT TEMP:", temp);

    valueCount++;

    runningMean = runningMean + (temp - runningMean) / valueCount;

    console.log("UPDATED MEAN: %s", runningMean.toFixed(5));

    if (valueCount >= 10) {
      channel.publish(
        AVG_EXCHANGE,
        "",
        Buffer.from(JSON.stringify({ tempMean: runningMean }))
      );
      valueCount = runningMean = 0;
    }
  });

  console.log("WAITING TEMP MESSAGES");
})();

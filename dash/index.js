const restify = require("restify");
const render = require("restify-render-middleware");
const amqp = require("amqplib");
const { Observable } = require("rxjs");

const AMQP_URL = process.env?.AMQP_URL || "amqp://localhost";
const AVG_EXCHANGE = process.env?.AVG_EXCHANGE || "tempMean";
const AVG_QUEUE = process.env?.AVG_QUEUE || "tempMeanClient";
const PORT = process.env?.PORT || 8080;

const createTempObservable = () => {
  const obs = new Observable(async (subscriber) => {
    try {
      const connection = await amqp.connect(AMQP_URL);
      const channel = await connection.createChannel();
      await channel.assertExchange(AVG_EXCHANGE);
      await channel.assertQueue(AVG_QUEUE);
      await channel.bindQueue(AVG_QUEUE, AVG_EXCHANGE);

      await channel.consume(AVG_QUEUE, (msg) => {
        const { tempMean } = JSON.parse(msg.content.toString());
        subscriber.next(tempMean);
      });
    } catch (err) {
      subscriber.error(err);
    }
  });

  return obs;
};

const server = restify.createServer();
server.use(
  render({
    engine: { name: "handlebars", extname: "hbs" },
    dir: __dirname + "/tpls",
  })
);

(async function () {
  let tempMean = 0;
  const $temp = createTempObservable();

  server.get("/", (req, res) => {
    res.render("dash", { tempMean });
  });

  server.get("/update", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    const updateTempMean = (tempMean, event = "updateTempMean") =>
      res.write(
        `event: ${event}\ndata: ${JSON.stringify(
          event === "updateTempMean" ? { tempMean } : tempMean
        )}\n\n`
      );

    updateTempMean(tempMean);
    $temp.subscribe({
      complete: () => res.end(),
      next: (newTempMean) => {
        tempMean = newTempMean;
        updateTempMean(newTempMean);
      },
      error: (err) => {
        console.error("ERROR ON OBSERVABLE", err);
        updateTempMean(err.stack, "error");
      },
    });
  });

  const instance = server.listen(PORT, () => {
    console.log("Server listening at", instance.address());
  });
})();

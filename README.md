# AMQP-DASH

This is a proof of concept of a system that receives data via amqp, aggregates
them in a average of the last 10 messages and then pushes the updates to a
webpage via SSE

## How to run (with docker compose)

(For each folder) npm i
docker compose up

Then you can access the html page at http://localhost:8080

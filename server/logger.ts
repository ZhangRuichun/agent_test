import pino from "pino";

// Configure transports
const transports = pino.transport({
  targets: [
    {
      target: "pino-pretty",
      level: "trace",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname"
      }
    },
    {
      target: "@axiomhq/pino",
      level: "info",
      options: {
        dataset: process.env.AXIOM_DATASET,
        token: process.env.AXIOM_TOKEN,
        ignore: "pid,hostname"
      }
    }
  ]
});

export const logger = pino({
  level: "trace",
}, transports);
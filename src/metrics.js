import client from "prom-client";

// Registry for all metrics
export const register = new client.Registry();

// Default system metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ register });

// Custom counter: total moves made
export const moveCounter = new client.Counter({
  name: "chess_moves_total",
  help: "Total number of moves made in the current game",
});

register.registerMetric(moveCounter);

// Middleware to time all requests
export const requestHistogram = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
});

register.registerMetric(requestHistogram);

export function metricsMiddleware(req, res, next) {
  const end = requestHistogram.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.path,
      status_code: res.status_code,
    });
  });
  next();
}

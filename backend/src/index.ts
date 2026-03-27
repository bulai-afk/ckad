import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import { feedbackRouter } from "./routes/feedback";
import { pagesRouter } from "./routes/pages";
import { authRouter } from "./routes/auth";

const app = express();
const port = process.env.PORT || 4000;
const requestLogEnabled = process.env.DEBUG_REQUESTS !== "0";

app.use(cors());
app.use(
  compression({
    threshold: 1024,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

if (requestLogEnabled) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const reqId = Math.random().toString(36).slice(2, 10);
    const contentLength = req.headers["content-length"] ?? "0";
    const hasBody =
      req.body && typeof req.body === "object" && Object.keys(req.body).length > 0;

    // eslint-disable-next-line no-console
    console.log(
      `[REQ ${reqId}] -> ${req.method} ${req.originalUrl} content-length=${contentLength}`,
    );
    if (hasBody) {
      const raw = JSON.stringify(req.body);
      const preview =
        raw.length > 800 ? `${raw.slice(0, 800)}...<truncated>` : raw;
      // eslint-disable-next-line no-console
      console.log(`[REQ ${reqId}] body=${preview}`);
    }

    res.on("finish", () => {
      const elapsedMs = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log(
        `[REQ ${reqId}] <- ${res.statusCode} ${req.method} ${req.originalUrl} ${elapsedMs}ms`,
      );
    });
    next();
  });
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/feedback", feedbackRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/auth", authRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`);
});



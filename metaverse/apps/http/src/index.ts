import express from "express";
import cors from "cors";
import { router } from "./routes/v1";
import { PORT, NODE_ENV } from "./constants";

const app = express();

// Allowed origins (no trailing slashes!)
const allowedOrigins =
  NODE_ENV === "production"
    ? ["https://metaverse-frontend-6gjy.onrender.com"]
    : ["http://localhost:5173", "http://localhost:8080"];

// CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/v1", router);

// Start server
app.listen(PORT, () => {
  console.log(`HTTP API running on port ${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins);
});

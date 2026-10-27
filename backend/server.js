require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./src/config/db");
const productRoutes = require("./src/routes/product.routes");
const recommendationRoutes = require("./src/routes/recommendation.routes");
const bundleRoutes = require("./src/routes/bundle.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");
const bundleRuleRoutes = require("./src/routes/bundleRule.routes");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/routes/auth.routes");
const { requireAuth } = require("./src/middleware/auth.middleware");
const { notFound, errorHandler } = require("./src/middleware/error.middleware");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Ricoz Bundle Engine API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", requireAuth, productRoutes);
app.use("/api/recommendations", requireAuth, recommendationRoutes);
app.use("/api/bundles", requireAuth, bundleRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/bundle-rules", requireAuth, bundleRuleRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start backend:", error.message);
    process.exit(1);
  }
}

startServer();

require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
    }
    await connectDB();
    app.listen(PORT, () => console.log(`CRM API running at http://localhost:${PORT}`));
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

start();

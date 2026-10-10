require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const name = (await rl.question("Admin name: ")).trim();
    const email = (await rl.question("Admin email: ")).trim().toLowerCase();
    const phone = (await rl.question("Phone (optional): ")).trim();
    const password = await rl.question("Admin password (min 8 chars): ");
    if (!name || !email || password.length < 8) {
      throw new Error("Name/email are required and password must be at least 8 characters");
    }
    if (await User.exists({ email })) throw new Error("A user with that email already exists");
    await User.create({ name, email, phone, password, role: "Admin" });
    console.log("Admin created successfully. Keep these credentials private.");
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

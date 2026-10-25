require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const BundleRule = require("./models/BundleRule");

const defaultRules = [
  {
    storeId: "demo-store",
    name: "Starter Bundle",
    description: "Add one relevant product to your cart.",
    addOnCount: 1,
    discountPercent: 5,
    enabled: true,
    sortOrder: 10,
  },
  {
    storeId: "demo-store",
    name: "Complete Bundle",
    description: "Add two relevant products and save more.",
    addOnCount: 2,
    discountPercent: 10,
    enabled: true,
    sortOrder: 20,
  },
];

async function seedBundleRules() {
  try {
    await connectDB();

    for (const rule of defaultRules) {
      await BundleRule.updateOne(
        {
          storeId: rule.storeId,
          name: rule.name,
        },
        {
          $setOnInsert: rule,
        },
        {
          upsert: true,
        },
      );
    }

    console.log("Default bundle rules are ready.");
  } catch (error) {
    console.error("Unable to seed bundle rules:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedBundleRules();

require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Product = require("./models/Product");

const demoProducts = [
  {
    name: "Running Shoes",
    description: "Lightweight shoes for everyday running.",
    category: "shoes",
    price: 60,
    inventory: 25,
  },
  {
    name: "Sports Socks",
    description: "Comfortable socks for sports and exercise.",
    category: "socks",
    price: 10,
    inventory: 80,
  },
  {
    name: "Shoe Care Kit",
    description: "Brush and cleaning solution for shoes.",
    category: "shoe care",
    price: 15,
    inventory: 30,
  },
  {
    name: "Sports Water Bottle",
    description: "Reusable bottle for workouts.",
    category: "accessories",
    price: 12,
    inventory: 50,
  },
  {
    name: "Wireless Headphones",
    description: "Wireless headphones for music and calls.",
    category: "electronics",
    price: 45,
    inventory: 20,
  },
  {
    name: "Phone Case",
    description: "Protective case for your smartphone.",
    category: "protection",
    price: 15,
    inventory: 40,
  },
  {
    name: "Phone Stand",
    description: "Adjustable stand for a smartphone.",
    category: "accessories",
    price: 12,
    inventory: 35,
  },
  {
    name: "Laptop Sleeve",
    description: "Protective sleeve for a laptop.",
    category: "protection",
    price: 20,
    inventory: 25,
  },
  {
    name: "Coffee Mug",
    description: "Reusable mug for your favourite coffee.",
    category: "mugs",
    price: 12,
    inventory: 45,
  },
  {
    name: "Coffee Filters",
    description: "Paper filters for home brewing.",
    category: "filters",
    price: 8,
    inventory: 100,
  },
];

async function seed() {
  try {
    await connectDB();

    // Only replace the demo store's sample catalog.
    await Product.deleteMany({ storeId: "demo-store" });

    const products = await Product.insertMany(
      demoProducts.map((product) => ({
        ...product,
        storeId: "demo-store",
      })),
    );

    const byName = Object.fromEntries(
      products.map((product) => [product.name, product]),
    );

    const relationships = {
      "Running Shoes": ["Sports Socks", "Shoe Care Kit"],
      "Sports Socks": ["Running Shoes"],
      "Wireless Headphones": ["Phone Stand"],
      "Phone Case": ["Phone Stand"],
      "Coffee Mug": ["Coffee Filters"],
      "Laptop Sleeve": ["Phone Stand"],
    };

    for (const [name, relatedNames] of Object.entries(relationships)) {
      await Product.updateOne(
        { _id: byName[name]._id },
        {
          $set: {
            relatedProductIds: relatedNames.map(
              (relatedName) => byName[relatedName]._id,
            ),
          },
        },
      );
    }

    console.log(`Inserted ${products.length} demo products.`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();

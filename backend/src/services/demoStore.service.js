const mongoose = require("mongoose");
const Product = require("../models/Product");
const BundleRule = require("../models/BundleRule");

const DEMO_PRODUCTS = [
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

const RELATIONSHIPS = {
  "Running Shoes": ["Sports Socks", "Shoe Care Kit"],
  "Sports Socks": ["Running Shoes"],
  "Wireless Headphones": ["Phone Stand"],
  "Phone Case": ["Phone Stand"],
  "Coffee Mug": ["Coffee Filters"],
  "Laptop Sleeve": ["Phone Stand"],
};

const DEFAULT_RULES = [
  {
    name: "Starter Bundle",
    description: "Add one relevant product to your cart.",
    addOnCount: 1,
    discountPercent: 5,
    sortOrder: 10,
  },
  {
    name: "Complete Bundle",
    description: "Add two relevant products and save more.",
    addOnCount: 2,
    discountPercent: 10,
    sortOrder: 20,
  },
  {
    name: "Accessory Bundle",
    description: "A small discount on a complementary add-on.",
    addOnCount: 1,
    discountPercent: 3,
    sortOrder: 30,
  },
];

async function initializeDemoStore(storeId) {
  const productCount = await Product.countDocuments({ storeId });

  // Only seed the catalog when this store has no products.
  if (productCount === 0) {
    const products = await Product.insertMany(
      DEMO_PRODUCTS.map((product) => ({
        ...product,
        storeId,
      })),
    );

    const byName = Object.fromEntries(
      products.map((product) => [product.name, product]),
    );

    for (const [name, relatedNames] of Object.entries(RELATIONSHIPS)) {
      await Product.updateOne(
        {
          _id: byName[name]._id,
          storeId,
        },
        {
          $set: {
            relatedProductIds: relatedNames.map(
              (relatedName) => byName[relatedName]._id,
            ),
          },
        },
      );
    }
  }

  // Insert default rules only if they don't already exist.
  // Existing customizations will remain unchanged.
  for (const rule of DEFAULT_RULES) {
    await BundleRule.updateOne(
      {
        storeId,
        name: rule.name,
      },
      {
        $setOnInsert: {
          ...rule,
          storeId,
          enabled: true,
        },
      },
      {
        upsert: true,
      },
    );
  }
}

module.exports = { initializeDemoStore };

const Product = require("../models/Product");

const COMPLEMENTARY_CATEGORIES = {
  shoes: ["socks", "shoe care", "accessories"],
  clothing: ["accessories", "care"],
  electronics: ["accessories", "protection"],
  phones: ["accessories", "protection"],
  laptops: ["accessories", "protection"],
  skincare: ["moisturizers", "cleansers", "sunscreen"],
  coffee: ["mugs", "filters", "accessories"],
};

async function getRecommendations(
  cartProductIds,
  limit = 4,
  storeId = "demo-store",
) {
  const cartProducts = await Product.find({
    _id: { $in: cartProductIds },
    storeId,
    active: true,
  }).lean();

  if (cartProducts.length === 0) {
    return [];
  }

  const cartIds = cartProducts.map((product) => product._id);
  const relatedIds = [
    ...new Set(
      cartProducts.flatMap((product) =>
        (product.relatedProductIds || []).map(String),
      ),
    ),
  ];

  const candidates = await Product.find({
    storeId,
    active: true,
    inventory: { $gt: 0 },
    _id: { $nin: cartIds },
  }).lean();

  const cartCategories = cartProducts.map((product) => product.category);
  const cartPrice = cartProducts.reduce(
    (total, product) => total + product.price,
    0,
  );

  const scored = candidates.map((candidate) => {
    let score = 0;
    const reasons = [];

    const explicitlyRelated = relatedIds.includes(String(candidate._id));

    if (explicitlyRelated) {
      score += 60;
      reasons.push("Frequently bought together");
    }

    const categoryMatch = cartCategories.some((category) =>
      (COMPLEMENTARY_CATEGORIES[category] || []).includes(candidate.category),
    );

    if (categoryMatch) {
      score += 30;
      reasons.push("Complements items in your cart");
    }

    const priceRatio = cartPrice > 0 ? candidate.price / cartPrice : 1;

    if (priceRatio >= 0.05 && priceRatio <= 0.5) {
      score += 10;
      reasons.push("Affordable add-on");
    }

    if (reasons.length === 0) {
      score = 5;
      reasons.push("Discover another product");
    }

    return {
      product: candidate,
      score,
      reasons,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

module.exports = { getRecommendations };

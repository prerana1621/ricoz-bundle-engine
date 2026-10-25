const Product = require("../models/Product");
const { getRecommendations } = require("./recommendation.service");

const MAX_DISCOUNT_PERCENT = 15;

// These rules are centrally controlled by the backend.
// The client cannot submit its own discount percentage.
const BUNDLE_RULES = [
  {
    id: "starter",
    name: "Starter Bundle",
    description: "Add one relevant product to your cart.",
    addOnCount: 1,
    discountPercent: 5,
  },
  {
    id: "complete",
    name: "Complete Bundle",
    description: "Add two relevant products and save more.",
    addOnCount: 2,
    discountPercent: 10,
  },
];

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function validateDiscount(percent, subtotal) {
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > MAX_DISCOUNT_PERCENT
  ) {
    const error = new Error("The configured discount is invalid.");
    error.statusCode = 500;
    throw error;
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    const error = new Error("The bundle subtotal is invalid.");
    error.statusCode = 500;
    throw error;
  }

  return roundMoney(Math.min(subtotal, subtotal * (percent / 100)));
}

async function generateBundleOffers(cartProductIds, storeId = "demo-store") {
  const uniqueCartIds = [...new Set(cartProductIds)];

  if (uniqueCartIds.length !== cartProductIds.length) {
    const error = new Error("Duplicate cart product IDs are not allowed.");
    error.statusCode = 400;
    throw error;
  }

  const cartProducts = await Product.find({
    _id: { $in: uniqueCartIds },
    storeId,
    active: true,
  }).lean();

  if (cartProducts.length !== uniqueCartIds.length) {
    const error = new Error(
      "One or more cart products were not found in this store.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (cartProducts.some((product) => product.inventory <= 0)) {
    const error = new Error(
      "A cart product is out of stock. Refresh the cart before generating offers.",
    );
    error.statusCode = 409;
    throw error;
  }

  const cartSubtotal = roundMoney(
    cartProducts.reduce((sum, product) => sum + product.price, 0),
  );

  // Reuse the recommendation engine instead of duplicating its logic.
  const recommendations = await getRecommendations(uniqueCartIds, 10, storeId);

  // Score >= 30 indicates an explicit relationship or category match.
  // Generic discovery suggestions do not qualify for a discounted bundle.
  const eligibleAddOns = recommendations.filter(
    ({ product, score }) =>
      score >= 30 &&
      product.active &&
      product.inventory > 0 &&
      !uniqueCartIds.includes(String(product._id)),
  );

  const bundles = BUNDLE_RULES.map((rule) => {
    const addOnProducts = eligibleAddOns
      .slice(0, rule.addOnCount)
      .map(({ product }) => product);

    if (addOnProducts.length !== rule.addOnCount) {
      return null;
    }

    const addOnSubtotal = roundMoney(
      addOnProducts.reduce((sum, product) => sum + product.price, 0),
    );

    const discountAmount = validateDiscount(
      rule.discountPercent,
      addOnSubtotal,
    );

    const originalTotal = roundMoney(cartSubtotal + addOnSubtotal);

    const finalTotal = Math.max(0, roundMoney(originalTotal - discountAmount));

    const incrementalRevenue = roundMoney(finalTotal - cartSubtotal);

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      discountPercent: rule.discountPercent,

      cartProductIds: uniqueCartIds,
      addOnProductIds: addOnProducts.map((product) => String(product._id)),

      cartProducts,
      addOnProducts,

      cartSubtotal,
      addOnSubtotal,
      discountAmount,
      originalTotal,
      finalTotal,
      incrementalRevenue,
    };
  }).filter(Boolean);

  return {
    currentCartSubtotal: cartSubtotal,
    bundles,
  };
}

module.exports = { generateBundleOffers };

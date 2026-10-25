const Product = require("../models/Product");

async function listProducts(req, res, next) {
  try {
    const storeId = req.query.storeId || "demo-store";

    const products = await Product.find({
      storeId,
      active: true,
    })
      .sort({ name: 1 })
      .limit(200)
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts };

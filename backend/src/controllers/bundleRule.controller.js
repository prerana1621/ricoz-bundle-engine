const mongoose = require("mongoose");
const BundleRule = require("../models/BundleRule");

const MAX_DISCOUNT_PERCENT = 15;

function validateRuleFields(body, partial = false) {
  const updates = {};

  if (!partial || body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 80
    ) {
      return {
        error: "Name must contain between 2 and 80 characters.",
      };
    }

    updates.name = body.name.trim();
  }

  if (!partial || body.description !== undefined) {
    if (
      body.description !== undefined &&
      (typeof body.description !== "string" || body.description.length > 300)
    ) {
      return {
        error: "Description cannot exceed 300 characters.",
      };
    }

    updates.description = (body.description || "").trim();
  }

  if (!partial || body.addOnCount !== undefined) {
    if (
      !Number.isInteger(body.addOnCount) ||
      body.addOnCount < 1 ||
      body.addOnCount > 5
    ) {
      return {
        error: "Add-on count must be an integer between 1 and 5.",
      };
    }

    updates.addOnCount = body.addOnCount;
  }

  if (!partial || body.discountPercent !== undefined) {
    if (
      typeof body.discountPercent !== "number" ||
      !Number.isFinite(body.discountPercent) ||
      body.discountPercent < 0 ||
      body.discountPercent > MAX_DISCOUNT_PERCENT
    ) {
      return {
        error: "Discount must be between 0 and 15 percent.",
      };
    }

    updates.discountPercent = body.discountPercent;
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return {
        error: "Enabled must be true or false.",
      };
    }

    updates.enabled = body.enabled;
  }

  if (body.sortOrder !== undefined) {
    if (
      !Number.isInteger(body.sortOrder) ||
      body.sortOrder < 0 ||
      body.sortOrder > 10000
    ) {
      return {
        error: "Sort order must be an integer from 0 to 10000.",
      };
    }

    updates.sortOrder = body.sortOrder;
  }

  return { updates };
}

async function listBundleRules(req, res, next) {
  try {
      const rules = await BundleRule.find({
        storeId: req.user.storeId,
      })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();

    return res.json({
      success: true,
      count: rules.length,
      rules,
    });
  } catch (error) {
    next(error);
  }
}

async function createBundleRule(req, res, next) {
  try {
    const { updates, error } = validateRuleFields(req.body || {});

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const rule = await BundleRule.create({
      ...updates,
      storeId: req.user.storeId,
    });

    return res.status(201).json({
      success: true,
      rule,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A bundle rule with this name already exists.",
      });
    }

    next(error);
  }
}

async function updateBundleRule(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bundle rule ID.",
      });
    }

    const body = req.body || {};
    const allowedFields = [
      "name",
      "description",
      "addOnCount",
      "discountPercent",
      "enabled",
      "sortOrder",
    ];

    const hasAllowedField = allowedFields.some(
      (field) => body[field] !== undefined,
    );

    if (!hasAllowedField) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const { updates, error } = validateRuleFields(body, true);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const rule = await BundleRule.findOneAndUpdate(
      {
        _id: req.params.id,
        storeId: req.user.storeId,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Bundle rule not found.",
      });
    }

    return res.json({
      success: true,
      rule,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A bundle rule with this name already exists.",
      });
    }

    next(error);
  }
}

module.exports = {
  listBundleRules,
  createBundleRule,
  updateBundleRule,
};

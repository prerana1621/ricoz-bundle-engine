const mongoose = require("mongoose");

const bundleRuleSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      default: "demo-store",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    addOnCount: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Add-on count must be an integer.",
      },
    },

    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 15,
      validate: {
        validator: Number.isFinite,
        message: "Discount must be a valid number.",
      },
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 100,
      min: 0,
      max: 10000,
      validate: {
        validator: Number.isInteger,
        message: "Sort order must be an integer.",
      },
    },
  },
  {
    timestamps: true,
  },
);

bundleRuleSchema.index({ storeId: 1, name: 1 }, { unique: true });

bundleRuleSchema.index({
  storeId: 1,
  enabled: 1,
  sortOrder: 1,
});

module.exports = mongoose.model("BundleRule", bundleRuleSchema);

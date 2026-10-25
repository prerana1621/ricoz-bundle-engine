const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      default: "demo-store",
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: [
        "recommendations_generated",
        "recommendation_added_to_cart",
        "bundles_generated",
        "bundle_applied",
      ],
    },

    itemCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 200,
      validate: {
        validator: Number.isInteger,
        message: "itemCount must be an integer",
      },
    },

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    bundleId: {
      type: String,
      default: "",
      maxlength: 80,
    },
  },
  {
    timestamps: true,
  },
);

analyticsEventSchema.index({
  storeId: 1,
  eventType: 1,
  createdAt: -1,
});

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);

const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/AnalyticsEvent");

const ALLOWED_EVENTS = new Set([
  "recommendations_generated",
  "recommendation_added_to_cart",
  "bundles_generated",
  "bundle_applied",
]);

async function trackEvent(req, res, next) {
  try {
    const body = req.body || {};

    const eventType = body.eventType;
    const itemCount = body.itemCount === undefined ? 0 : body.itemCount;
    const productIds = body.productIds === undefined ? [] : body.productIds;
    const bundleId = body.bundleId === undefined ? "" : body.bundleId;

    if (!ALLOWED_EVENTS.has(eventType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid analytics event type.",
      });
    }

    if (!Number.isInteger(itemCount) || itemCount < 0 || itemCount > 200) {
      return res.status(400).json({
        success: false,
        message: "itemCount must be an integer from 0 to 200.",
      });
    }

    if (
      !Array.isArray(productIds) ||
      productIds.length > 50 ||
      productIds.some(
        (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product IDs.",
      });
    }

    if (typeof bundleId !== "string" || bundleId.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Invalid bundle ID.",
      });
    }

    // This endpoint is for the local demo store only.
    // Do not accept a storeId supplied by the browser.
    const event = await AnalyticsEvent.create({
      storeId: "demo-store",
      eventType,
      itemCount,
      productIds,
      bundleId,
    });

    return res.status(201).json({
      success: true,
      message: "Analytics event recorded.",
      eventId: String(event._id),
    });
  } catch (error) {
    next(error);
  }
}

async function getAnalyticsSummary(req, res, next) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const groupedEvents = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: "demo-store",
          createdAt: {
            $gte: thirtyDaysAgo,
          },
        },
      },
      {
        $group: {
          _id: "$eventType",
          eventCount: {
            $sum: 1,
          },
          itemCount: {
            $sum: "$itemCount",
          },
        },
      },
    ]);

    const stats = {};

    for (const group of groupedEvents) {
      stats[group._id] = group;
    }

    function getEventCount(eventType) {
      return stats[eventType] ? stats[eventType].eventCount : 0;
    }

    function getItemCount(eventType) {
      return stats[eventType] ? stats[eventType].itemCount : 0;
    }

    const totalTrackedEvents = groupedEvents.reduce(
      (total, group) => total + group.eventCount,
      0,
    );

    return res.json({
      success: true,
      periodDays: 30,
      metrics: {
        recommendationItemsShown: getItemCount("recommendations_generated"),

        recommendationAdds: getEventCount("recommendation_added_to_cart"),

        bundleOffersShown: getItemCount("bundles_generated"),

        bundleApplications: getEventCount("bundle_applied"),

        totalTrackedEvents,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackEvent,
  getAnalyticsSummary,
};

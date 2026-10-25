"use client";

import { useCallback, useEffect, useState } from "react";
import "./page.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cartIds, setCartIds] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [appliedBundle, setAppliedBundle] = useState(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [analytics, setAnalytics] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load products.");
      }

      setProducts(data.products || []);
    } catch (err) {
      setError(
        `${err.message} Check that the backend is running and MongoDB is connected.`,
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);
  
  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch(API_URL + "/analytics/summary");
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load analytics.");
      }
      
      setAnalytics(data.metrics);
    } catch (err) {
      console.error("Analytics refresh failed:", err);
    }
  }, []);
  
  useEffect(() => {
    loadProducts();
    loadAnalytics();
  }, [loadProducts, loadAnalytics]);

  async function trackAnalyticsEvent(event) {
    try {
      const response = await fetch(API_URL + "/analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        console.error("The analytics event could not be recorded.");
      }
    } catch (err) {
      // Analytics failures must not break shopping interactions.
      console.error("Analytics tracking failed:", err);
    }
  }

  const cartProducts = products.filter((product) =>
    cartIds.includes(product._id),
  );

  const cartSubtotal = cartProducts.reduce(
    (total, product) => total + product.price,
    0,
  );

  const discountAmount = appliedBundle ? appliedBundle.discountAmount : 0;

  const cartTotal =
    Math.round((cartSubtotal - discountAmount + Number.EPSILON) * 100) / 100;

  function resetOffers() {
    setRecommendations([]);
    setBundles([]);
    setAppliedBundle(null);
  }

  function toggleCart(productId) {
    setCartIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );

    resetOffers();
    setNotice("");
    setError("");
  }

  async function generateRecommendations() {
    if (cartIds.length === 0) {
      setNotice("Select at least one product for the cart.");
      return;
    }

    if (appliedBundle) {
      setNotice(
        "A bundle discount is already applied. Change the cart before generating new offers.",
      );
      return;
    }

    try {
      setLoadingRecommendations(true);
      setError("");
      setNotice("");
      setRecommendations([]);
      setBundles([]);

      const [recommendationResponse, bundleResponse] = await Promise.all([
        fetch(API_URL + "/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartProductIds: cartIds,
            limit: 4,
          }),
        }),

        fetch(API_URL + "/bundles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartProductIds: cartIds,
            storeId: "demo-store",
          }),
        }),
      ]);

      const [recommendationData, bundleData] = await Promise.all([
        recommendationResponse.json(),
        bundleResponse.json(),
      ]);

      if (!recommendationResponse.ok || !recommendationData.success) {
        throw new Error(
          recommendationData.message || "Unable to load recommendations.",
        );
      }

      if (!bundleResponse.ok || !bundleData.success) {
        throw new Error(
          bundleData.message || "Unable to generate bundle offers.",
        );
      }

      const recommendationList = recommendationData.recommendations || [];

      const bundleList = bundleData.bundles || [];

      setRecommendations(recommendationList);
      setBundles(bundleList);

      // Record how many recommendation items and bundle offers
      // were generated for display.
      await Promise.all([
        trackAnalyticsEvent({
          eventType: "recommendations_generated",
          itemCount: recommendationList.length,
        }),

        trackAnalyticsEvent({
          eventType: "bundles_generated",
          itemCount: bundleList.length,
        }),
      ]);

      await loadAnalytics();

      setNotice(
        "Generated " +
          recommendationList.length +
          " product recommendations and " +
          bundleList.length +
          " bundle offers.",
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoadingRecommendations(false);
    }
  }

  function addRecommendedProduct(product) {
    setCartIds((current) =>
      current.includes(product._id) ? current : [...current, product._id],
    );

    resetOffers();

    setNotice(product.name + " added to your demo cart.");

    setError("");

    void trackAnalyticsEvent({
      eventType: "recommendation_added_to_cart",
      productIds: [product._id],
    }).then(() => loadAnalytics());
  }

  function applyBundle(bundle) {
    if (appliedBundle) {
      setNotice("A bundle discount is already applied to this demo cart.");
      return;
    }

    const addOnIds = bundle.addOnProductIds || [];

    if (addOnIds.length === 0) {
      setNotice("This bundle contains no eligible add-on products.");
      return;
    }

    const existingIds = new Set(cartIds);

    if (addOnIds.some((id) => existingIds.has(id))) {
      setNotice(
        "This offer is out of date. Change the cart and generate new offers.",
      );
      resetOffers();
      return;
    }

    setCartIds((current) => [...new Set([...current, ...addOnIds])]);

    setAppliedBundle({
      id: bundle.id,
      name: bundle.name,
      discountPercent: bundle.discountPercent,
      discountAmount: bundle.discountAmount,
    });

    setRecommendations([]);
    setBundles([]);
    setError("");

    setNotice(
      `${bundle.name} applied to your demo cart. The discount is simulated and is not applied to a real Shopify checkout.`,
    );

    void trackAnalyticsEvent({
      eventType: "bundle_applied",
      bundleId: bundle.id,
      productIds: addOnIds,
    }).then(() => loadAnalytics());
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">R</span>
          <span>
            Ricoz <span className="muted">Commerce</span>
          </span>
        </a>

        <span className="environment">DEMO STORE</span>
      </header>

      <section className="intro">
        <p className="eyebrow">COMMERCE INTELLIGENCE</p>

        <h1>Bundle & Cross-Sell Engine</h1>

        <p className="subtitle">
          Discover complementary products and build smarter shopping carts.
        </p>
      </section>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="alert" role="status">
          {notice}
        </div>
      )}

      <section className="metrics">
        <article className="metric-card">
          <span className="metric-label">Catalog products</span>

          <strong>{loadingProducts ? "—" : products.length}</strong>

          <span className="metric-note">Products in the demo catalog</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Cart total</span>

          <strong>{money(cartTotal)}</strong>

          <span className="metric-note">
            {cartProducts.length} selected product(s)
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Recommendations</span>

          <strong>{recommendations.length}</strong>

          <span className="metric-note">Generated for this cart</span>
        </article>
      </section>

      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">STEP 05</p>
            <h2>Interaction analytics</h2>
          </div>

          <button className="button secondary" onClick={loadAnalytics}>
            Refresh metrics
          </button>
        </div>

        <p className="muted-text">
          Tracked demo interactions from the last 30 days.
        </p>

        <div className="analytics-grid">
          <article className="analytics-card">
            <span>Recommended items shown</span>
            <strong>
              {analytics ? analytics.recommendationItemsShown : "—"}
            </strong>
          </article>

          <article className="analytics-card">
            <span>Recommendations added to cart</span>
            <strong>{analytics ? analytics.recommendationAdds : "—"}</strong>
          </article>

          <article className="analytics-card">
            <span>Bundle offers shown</span>
            <strong>{analytics ? analytics.bundleOffersShown : "—"}</strong>
          </article>

          <article className="analytics-card">
            <span>Bundles applied</span>
            <strong>{analytics ? analytics.bundleApplications : "—"}</strong>
          </article>
        </div>

        <p className="analytics-note">
          These are recorded interaction counts, not unique customers, completed
          orders, or verified sales conversions.
        </p>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">STEP 01</p>
              <h2>Product catalog</h2>
            </div>

            <button
              className="button secondary"
              onClick={loadProducts}
              disabled={loadingProducts}
            >
              Refresh
            </button>
          </div>

          {loadingProducts ? (
            <p className="empty">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="empty">
              No products found. Run the backend seed command first.
            </p>
          ) : (
            <div className="product-list">
              {products.map((product) => {
                const selected = cartIds.includes(product._id);

                return (
                  <article className="product-row" key={product._id}>
                    <div className="product-icon">
                      {product.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="product-info">
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>

                      <span className="product-price">
                        {money(product.price)}
                      </span>
                    </div>

                    <button
                      className={`button ${
                        selected ? "selected" : "secondary"
                      }`}
                      onClick={() => toggleCart(product._id)}
                    >
                      {selected ? "Remove" : "Add to cart"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <button
            className="button primary generate-button"
            onClick={generateRecommendations}
            disabled={loadingRecommendations || loadingProducts}
          >
            {loadingRecommendations
              ? "Generating..."
              : "Generate recommendations"}
          </button>
        </div>

        <aside className="panel cart-panel">
          <p className="eyebrow">STEP 02</p>
          <h2>Your cart</h2>

          <p className="muted-text">
            Select products from the catalog to begin.
          </p>

          {cartProducts.length === 0 ? (
            <div className="empty cart-empty">
              <span className="empty-icon">＋</span>
              Your cart is empty
            </div>
          ) : (
            <div className="cart-list">
              {cartProducts.map((product) => (
                <div className="cart-item" key={product._id}>
                  <span>{product.name}</span>
                  <strong>{money(product.price)}</strong>
                </div>
              ))}

              {appliedBundle ? (
                <>
                  <div className="cart-total">
                    <span>Subtotal</span>
                    <strong>{money(cartSubtotal)}</strong>
                  </div>

                  <div className="cart-item discount-row">
                    <span>
                      Bundle discount ({appliedBundle.discountPercent}% off
                      add-ons)
                    </span>

                    <strong>−{money(appliedBundle.discountAmount)}</strong>
                  </div>

                  <div className="cart-total">
                    <span>Total after discount</span>
                    <strong>{money(cartTotal)}</strong>
                  </div>
                </>
              ) : (
                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{money(cartSubtotal)}</strong>
                </div>
              )}
            </div>
          )}

          <div className="tip">
            <strong>How it works</strong>

            <p>
              The engine ranks in-stock products using category compatibility,
              related-product rules, and price relevance.
            </p>
          </div>
        </aside>
      </section>

      <section className="panel recommendations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">STEP 03</p>
            <h2>Recommended for this cart</h2>
          </div>

          <span className="count-badge">{recommendations.length} results</span>
        </div>

        {recommendations.length === 0 ? (
          <div className="empty">
            Generate recommendations to see complementary products.
          </div>
        ) : (
          <div className="recommendation-grid">
            {recommendations.map(({ product, score, reasons }) => (
              <article className="recommendation-card" key={product._id}>
                <div className="recommendation-top">
                  <span className="product-icon large">
                    {product.name.charAt(0).toUpperCase()}
                  </span>

                  <span className="score">Score: {score}</span>
                </div>

                <h3>{product.name}</h3>

                <p className="muted-text">{product.description}</p>

                <strong className="recommendation-price">
                  {money(product.price)}
                </strong>

                <ul className="reason-list">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>

                <button
                  className="button primary full-width"
                  onClick={() => addRecommendedProduct(product)}
                >
                  Add to cart
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel bundles-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">STEP 04</p>
            <h2>Dynamic bundle offers</h2>
          </div>

          <span className="count-badge">{bundles.length} offers</span>
        </div>

        {bundles.length === 0 ? (
          <div className="empty">
            {appliedBundle
              ? `${appliedBundle.name} has been applied to your demo cart.`
              : "Select products in your cart and generate recommendations to discover bundle deals."}
          </div>
        ) : (
          <div className="bundle-grid">
            {bundles.map((bundle) => (
              <article className="bundle-card" key={bundle.id}>
                <div className="bundle-badges">
                  <span className="bundle-discount">
                    {bundle.discountPercent}% off add-ons
                  </span>

                  <span className="bundle-type">
                    {bundle.addOnProducts.length} add-on
                    {bundle.addOnProducts.length === 1 ? "" : "s"}
                  </span>
                </div>

                <h3>{bundle.name}</h3>

                <p className="muted-text">{bundle.description}</p>

                <div className="bundle-item-list">
                  <strong>Already in your cart</strong>

                  <ul>
                    {bundle.cartProducts.map((product) => (
                      <li key={product._id}>{product.name}</li>
                    ))}
                  </ul>

                  <strong>Added with this offer</strong>

                  <ul>
                    {bundle.addOnProducts.map((product) => (
                      <li key={product._id}>
                        {product.name} — {money(product.price)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bundle-pricing">
                  <div className="bundle-pricing-row">
                    <span>Original combined total</span>
                    <del>{money(bundle.originalTotal)}</del>
                  </div>

                  <div className="bundle-pricing-row">
                    <span>Discount on add-ons</span>

                    <strong className="discount-text">
                      −{money(bundle.discountAmount)}
                    </strong>
                  </div>

                  <div className="bundle-pricing-row bundle-final-price">
                    <span>Total with offer</span>
                    <strong>{money(bundle.finalTotal)}</strong>
                  </div>

                  <div className="bundle-pricing-row">
                    <span>Added cart value if accepted</span>
                    <strong>{money(bundle.incrementalRevenue)}</strong>
                  </div>
                </div>

                <button
                  className="button primary full-width"
                  onClick={() => applyBundle(bundle)}
                >
                  Apply bundle to demo cart
                </button>
              </article>
            ))}
          </div>
        )}

        <p className="bundle-disclaimer">
          Demo pricing only. Discounts apply to add-on products and do not
          affect a real Shopify checkout. Actual sales and AOV improvements have
          not yet been measured.
        </p>
      </section>

      <footer>
        Ricoz Bundle Engine · Development prototype · Demo data only
      </footer>
    </main>
  );
}

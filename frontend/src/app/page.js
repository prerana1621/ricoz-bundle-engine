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
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load products.");
      }

      setProducts(data.products);
    } catch (err) {
      setError(
        `${err.message} Check that the backend is running and MongoDB is connected.`,
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function toggleCart(productId) {
    setCartIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );

    setRecommendations([]);
    setNotice("");
  }

  const cartProducts = products.filter((product) =>
    cartIds.includes(product._id),
  );

  const cartTotal = cartProducts.reduce(
    (total, product) => total + product.price,
    0,
  );

  async function generateRecommendations() {
    if (cartIds.length === 0) {
      setNotice("Select at least one product for the cart.");
      return;
    }

    try {
      setLoadingRecommendations(true);
      setError("");
      setNotice("");
      setRecommendations([]);

      const response = await fetch(`${API_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartProductIds: cartIds,
          limit: 4,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to generate recommendations.");
      }

      setRecommendations(data.recommendations);
      setNotice(
        data.recommendations.length
          ? "Recommendations generated successfully."
          : "No eligible recommendations were found.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRecommendations(false);
    }
  }

  function addRecommendedProduct(product) {
    setCartIds((current) =>
      current.includes(product._id) ? current : [...current, product._id],
    );

    setRecommendations([]);
    setNotice(`${product.name} added to your demo cart.`);
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

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert">{notice}</div>}

      <section className="metrics">
        <article className="metric-card">
          <span className="metric-label">Catalog products</span>
          <strong>{loadingProducts ? "—" : products.length}</strong>
          <span className="metric-note">Available in the demo catalog</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Cart subtotal</span>
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
                      className={`button ${selected ? "selected" : "secondary"}`}
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

              <div className="cart-total">
                <span>Subtotal</span>
                <strong>{money(cartTotal)}</strong>
              </div>
            </div>
          )}

          <div className="tip">
            <strong>How it works</strong>
            <p>
              The engine ranks in-stock products using category compatibility,
              related-product rules and price relevance.
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
            Your recommendations will appear here after generation.
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

      <footer>
        Ricoz Bundle Engine · Development prototype · Demo data only
      </footer>
    </main>
  );
}

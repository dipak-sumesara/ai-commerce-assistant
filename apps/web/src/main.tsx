import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  PackageSearch,
  RefreshCw,
  Search,
  Send,
  Server,
} from "lucide-react";
import {
  chatResponseSchema,
  productSearchResponseSchema,
  type ChatMessage,
  type Product,
  type ProductSearchIntent,
} from "@ai-commerce/shared";
import "./styles.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type Status = {
  reachable: boolean;
  baseUrl: string;
  model: string;
  embedModel: string;
  modelAvailable?: boolean;
  embedModelAvailable?: boolean;
  error?: string;
};

function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    "nike t-shirts under $50, black preferred",
  );
  const [intent, setIntent] = useState<ProductSearchIntent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about delivery, returns, cancellation, shipping, ordering, services, or products.",
    },
  ]);
  const [chatInput, setChatInput] = useState(
    "What is your average delivery time?",
  );
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    void refreshStatus();
    void fetchProducts();
  }, []);

  async function refreshStatus() {
    const response = await fetch(`${API_BASE_URL}/api/ollama/status`);
    setStatus(await response.json());
  }

  async function fetchProducts() {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    const body = (await response.json()) as { products: Product[] };
    setProducts(body.products.slice(0, 8));
  }

  async function runProductSearch(event: FormEvent) {
    event.preventDefault();
    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/product-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Product search failed.");
      const parsed = productSearchResponseSchema.parse(body);
      setIntent(parsed.intent);
      setProducts(parsed.products);
      if (parsed.message) setSearchError(parsed.message);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Product search failed.",
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-8),
          think: false,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Assistant request failed.");
      const parsed = chatResponseSchema.parse(body);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: parsed.answer },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Assistant request failed.",
      );
      setMessages(messages);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Portfolio MVP</p>
          <h1>AI Commerce Assistant</h1>
        </div>
        <button
          className="iconButton"
          title="Refresh Ollama status"
          onClick={() => void refreshStatus()}
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="statusBand">
        <Server size={18} />
        <span>Ollama</span>
        <strong className={status?.reachable ? "ok" : "bad"}>
          {status?.reachable ? "Reachable" : "Unavailable"}
        </strong>
        <span className={status?.modelAvailable === false ? "bad" : ""}>
          {status?.model ?? "checking model"}
        </span>
        <span className={status?.embedModelAvailable === false ? "bad" : ""}>
          {status?.embedModel ?? "checking embeddings"}
        </span>
      </section>

      <div className="workspace">
        <section className="panel searchPanel">
          <div className="sectionTitle">
            <PackageSearch size={20} />
            <h2>AI Product Search</h2>
          </div>
          <form
            className="searchForm"
            onSubmit={(event) => void runProductSearch(event)}
          >
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="✨ Describe what you're looking for"
            />
            <button type="submit" disabled={searchLoading}>
              <Search size={18} />
              {searchLoading ? "Interpreting" : "Search"}
            </button>
          </form>
          <p className="example">
            Example: nike t-shirts under $50, black preferred
          </p>

          {intent && <IntentSummary intent={intent} />}
          {searchError && <p className="error">{searchError}</p>}

          <div className="resultsHeader">
            <h2>Product Results</h2>
            <span>{products.length} items</span>
          </div>
          <div className="productGrid">
            {products.map((product) => (
              <article className="productCard" key={product.id}>
                <div>
                  <p className="brand">{product.brand}</p>
                  <h3>{product.name}</h3>
                </div>
                <strong>${product.price.toFixed(2)}</strong>
                <p>
                  {product.category} / {product.subcategory}
                </p>
                <div className="swatches">
                  {product.colors.map((color) => (
                    <span key={color}>{color}</span>
                  ))}
                </div>
                <p className="inventory">{product.inventory} in inventory</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel chatPanel">
          <div className="sectionTitle">
            <Bot size={20} />
            <h2>AI Commerce Assistant</h2>
          </div>
          <div className="messages">
            {messages.map((message, index) => (
              <div
                className={`message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.content}
              </div>
            ))}
            {chatLoading && (
              <div className="message assistant">
                Checking approved knowledge...
              </div>
            )}
          </div>
          {chatError && <p className="error">{chatError}</p>}
          <form
            className="chatForm"
            onSubmit={(event) => void sendMessage(event)}
          >
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about delivery, returns, shipping, or ordering"
            />
            <button type="submit" disabled={chatLoading}>
              <Send size={18} />
              Send
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function IntentSummary({ intent }: { intent: ProductSearchIntent }) {
  const filters = intent.requiredFilters;
  const colorPreference = intent.preferences.colors
    .map((color) => color.value)
    .join(", ");

  return (
    <div className="intent">
      <span>Interpreted intent</span>
      {filters.brand && <b>Brand: {filters.brand}</b>}
      {filters.category && <b>Category: {filters.category}</b>}
      {filters.subcategory && <b>Type: {filters.subcategory}</b>}
      {filters.maxPrice && <b>Max price: ${filters.maxPrice}</b>}
      {colorPreference && <b>Preference: {colorPreference}</b>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

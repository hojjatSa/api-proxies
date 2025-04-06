// v0.1
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

// Token from Directus (stored in .env)
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
const DIRECTUS_API = process.env.DIRECTUS_API || "https://core.hojjatsa.com";

async function loadProxies() {
  try {
    const res = await fetch(`${DIRECTUS_API}/items/proxies`, {
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
    });

    if (!res.ok) {
      console.error("Failed to fetch proxies:", res.status);
      console.error(await res.text());
      return;
    }

    const data = await res.json();
    if (!data.data) throw new Error("Invalid response from Directus");

    const proxies = data.data.filter((p) => p.is_active);

    for (const proxy of proxies) {
      const { path, target_url, auth_required, auth_token } = proxy;

      console.log(`Mounting proxy: ${path} → ${target_url}`);

      // Middleware برای بررسی توکن اختیاری
      const checkAuth = (req, res, next) => {
        if (!auth_required) return next();
        const token = req.headers["x-proxy-token"];
        if (token !== auth_token)
          return res.status(403).send("Unauthorized Proxy");
        next();
      };

      app.use(
        path,
        checkAuth,
        createProxyMiddleware({
          target: target_url,
          changeOrigin: true,
          pathRewrite: (pathReq, req) => pathReq.replace(path, ""),
        })
      );
    }
  } catch (err) {
    console.error("❌ Error loading proxies:", err.message);
  }
}

app.get("/", (req, res) => res.send("Proxy Server is running 🟢"));

app.listen(PORT, async () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
  await loadProxies();
  // Optional: reload proxies every 5 minutes
  setInterval(loadProxies, 5 * 60 * 1000);
});

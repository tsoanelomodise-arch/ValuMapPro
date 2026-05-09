import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/fetch-listing", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`[Proxy] Fetching listing starting: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "DNT": "1",
          "Upgrade-Insecure-Requests": "1"
        },
      });

      console.log(`[Proxy] Target response status: ${response.status} for ${url}`);

      if (!response.ok) {
        // If we get an error from the site, return it as a 200 with error info so the client can handle it gracefully
        // or just return the error status. Returning the actual status is better for debugging.
        return res.status(response.status).json({ 
          error: `The property listing site returned an error (${response.status}).`,
          url: url
        });
      }

      const html = await response.text();
      console.log(`[Proxy] HTML length: ${html.length}`);
      
      // Basic text extraction to keep payloads manageable for Gemini
      // Strip scripts, styles, and other heavy non-content tags
      const cleanedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

      res.send(cleanedHtml);
    } catch (error) {
      console.error("[Proxy] Error fetching listing:", error);
      res.status(500).json({ 
        error: "Failed to fetch property details. The listing might be private or blocked.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

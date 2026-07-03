"use strict";

const express = require("express");
const openApiDocument = require("../../docs/openapi");
const { BRANDING } = require("../../config/branding");

const router = express.Router();

router.get("/docs/openapi.json", (req, res) => {
    res.json(openApiDocument);
});

router.get("/docs", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRANDING.APP_NAME} API Docs</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #f6f7fb; color: #172033; }
    main { max-width: 920px; margin: 48px auto; padding: 0 24px; }
    section { background: #fff; border: 1px solid #dde4ef; border-radius: 12px; padding: 24px; box-shadow: 0 8px 28px rgba(15, 23, 42, .06); }
    code, a { color: #2563eb; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>${BRANDING.APP_NAME} API Documentation</h1>
      <p>This service exposes an OpenAPI 3.0 document for auth, plans, topics, scheduling, and adaptive execution APIs.</p>
      <ul>
        <li><a href="/api/v1/docs/openapi.json">OpenAPI JSON</a></li>
        <li>Use the JSON with Swagger Editor, Postman, Insomnia, or Redoc during manual deployment.</li>
        <li>Bearer-token protected endpoints document ownership-sensitive behavior explicitly.</li>
      </ul>
      <p>Local base URL: <code>http://localhost:8000/api/v1</code></p>
    </section>
  </main>
</body>
</html>`);
});

module.exports = router;

import express from "express";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.get("/health", (req, res) => res.send("ok"));

app.post("/api/analyze", async (req, res) => {
  try {
    // ✅ Forward the app request EXACTLY as-is
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(req.body) // ⭐ THIS is the fix
    });

    const text = await r.text();
    res.status(r.status).send(text);

  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(process.env.PORT || 3000);

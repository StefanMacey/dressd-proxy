import express from "express";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.get("/health", (req, res) => res.send("ok"));

app.post("/api/analyze", async (req, res) => {
  try {
    const { imageBase64, vibe, season } = req.body;
    const dataURL = `data:image/jpeg;base64,${imageBase64}`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `VIBE: ${vibe}\nSEASON: ${season}\nReturn JSON only.` },
            { type: "input_image", image_url: dataURL }
          ]
        }]
      })
    });

    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(process.env.PORT || 3000);

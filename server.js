import express from "express";

const app = express();
app.use(express.json({ limit: "35mb" }));

app.get("/health", (req, res) => res.send("ok"));

app.post("/api/analyze", async (req, res) => {
  try {
    const {
      imageBase64,
      vibe,
      season,
      recentFixes = [],
      learningProfile = "",
      onboardingProfile = ""
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const dataURL = `data:image/jpeg;base64,${imageBase64}`;

    // ✅ REAL RUBRIC — NO DOUBLE BACKTICKS
    const rubric = `
SCORING RUBRIC (use FULL range 2–99, do NOT cluster around 60–75):
- 2–20: clashing colours, messy silhouette, poor fit
- 21–40: multiple issues
- 41–60: average
- 61–80: strong
- 81–92: very good
- 93–99: exceptional

ACCURACY RULES:
- Only recommend changes visible in THIS photo.
- If unsure say "unclear from photo".
- NEVER suggest tuck if already tucked.
- NEVER suggest tailoring if already fitted.

VARIETY RULES:
- Avoid repetitive seasonal clichés.
- Focus on silhouette before accessories.
- Max 1 accessory suggestion.

MEMORY RULES:
- Avoid repeating recent fixes.
`;

    const openaiBody = {
      model: "gpt-4o-mini",
      temperature: 0,
      input: [
        {
          role: "system",
          content: [
            { type: "input_text", text: "You are DRESSD. Be kind, direct, and specific. No filler." }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${rubric}

VIBE SELECTED BY USER: "${vibe}"
SEASON: "${season}"

RECENT SUGGESTIONS:
${recentFixes.length ? recentFixes.map(x => `- ${x}`).join("\n") : "- none"}

USER RESPONSE PROFILE:
${learningProfile}
${onboardingProfile}

TASK:
Analyse the image and return JSON only.
`
            },
            { type: "input_image", image_url: dataURL }
          ]
        }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(openaiBody)
    });

    const text = await r.text();

    res.status(r.status).send(text);

  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(process.env.PORT || 3000);

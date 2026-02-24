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

RECENT SUGGESTIONS (DO NOT REPEAT THESE FIX IDEAS):
${recentFixes.length ? recentFixes.map(x => `- ${x}`).join("\n") : "- none"}

USER RESPONSE PROFILE (ADAPT TO THIS USER):
${learningProfile}

${onboardingProfile}

TASK:
Return JSON ONLY that matches the schema.
`
            },
            { type: "input_image", image_url: dataURL }
          ]
        }
      ],

      // ✅ THIS IS THE FIX (forces valid JSON every time)
      text: {
        format: {
          type: "json_schema",
          name: "outfit_result_v4",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "isOutfit","rejectionMessage",
              "shirtTucked","shirtFit",
              "scoreOutOf100","breakdown","overallSummary",
              "whatsWorking","whatsHoldingBack",
              "colourNotes","fitNotes","occasionNotes",
              "topFixes","accessoryIdeas",
              "estimatedScoreAfterTopFixes","confidence"
            ],
            properties: {
              isOutfit: { type: "boolean" },
              rejectionMessage: { type: "string" },

              shirtTucked: { type: "string", enum: ["yes","no","unclear"] },
              shirtFit: { type: "string", enum: ["tight","regular","loose","unclear"] },

              scoreOutOf100: { type: "integer", minimum: 2, maximum: 99 },

              breakdown: {
                type: "object",
                additionalProperties: false,
                required: ["colour","fit","cohesion","occasion"],
                properties: {
                  colour: { type: "integer", minimum: 0, maximum: 100 },
                  fit: { type: "integer", minimum: 0, maximum: 100 },
                  cohesion: { type: "integer", minimum: 0, maximum: 100 },
                  occasion: { type: "integer", minimum: 0, maximum: 100 }
                }
              },

              overallSummary: { type: "string" },

              whatsWorking: { type: "array", minItems: 0, maxItems: 3, items: { type: "string" } },
              whatsHoldingBack: { type: "array", minItems: 0, maxItems: 3, items: { type: "string" } },

              colourNotes: { type: "array", minItems: 0, maxItems: 5, items: { type: "string" } },
              fitNotes: { type: "array", minItems: 0, maxItems: 4, items: { type: "string" } },
              occasionNotes: { type: "array", minItems: 0, maxItems: 4, items: { type: "string" } },

              topFixes: {
                type: "array",
                minItems: 0,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title","reason","action","impactScore","priority"],
                  properties: {
                    title: { type: "string" },
                    reason: { type: "string" },
                    action: { type: "string" },
                    impactScore: { type: "integer", minimum: 1, maximum: 25 },
                    priority: { type: "integer", minimum: 1, maximum: 5 }
                  }
                }
              },

              accessoryIdeas: {
                type: "array",
                minItems: 0,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title","reason","action","impactScore","priority"],
                  properties: {
                    title: { type: "string" },
                    reason: { type: "string" },
                    action: { type: "string" },
                    impactScore: { type: "integer", minimum: 1, maximum: 25 },
                    priority: { type: "integer", minimum: 1, maximum: 5 }
                  }
                }
              },

              estimatedScoreAfterTopFixes: { type: "integer", minimum: 2, maximum: 99 },
              confidence: { type: "string", enum: ["low","medium","high"] }
            }
          }
        }
      }
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

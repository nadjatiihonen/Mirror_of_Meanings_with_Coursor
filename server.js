import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported image type"));
  },
});

const DMC_PALETTE = [
  { code: "B5200", name: "Snow White", rgb: [255, 255, 255] },
  { code: "Blanc", name: "White", rgb: [252, 251, 248] },
  { code: "310", name: "Black", rgb: [0, 0, 0] },
  { code: "415", name: "Pearl Gray", rgb: [211, 211, 214] },
  { code: "762", name: "Pearl Gray - Light", rgb: [236, 236, 238] },
  { code: "318", name: "Steel Gray - Light", rgb: [171, 171, 171] },
  { code: "414", name: "Steel Gray - Dark", rgb: [140, 140, 140] },
  { code: "317", name: "Pewter Gray", rgb: [108, 108, 108] },
  { code: "3799", name: "Pewter Gray - Very Dark", rgb: [66, 66, 66] },
  { code: "819", name: "Baby Pink", rgb: [255, 238, 233] },
  { code: "3354", name: "Dusty Rose - Light", rgb: [228, 166, 172] },
  { code: "315", name: "Antique Mauve - Med Dark", rgb: [163, 90, 98] },
  { code: "606", name: "Orange-Red - Bright", rgb: [250, 50, 3] },
  { code: "743", name: "Yellow - Med", rgb: [255, 231, 147] },
  { code: "744", name: "Yellow - Pale", rgb: [255, 251, 169] },
  { code: "307", name: "Lemon", rgb: [253, 237, 84] },
  { code: "702", name: "Kelly Green", rgb: [71, 167, 47] },
  { code: "704", name: "Bright Green", rgb: [158, 207, 52] },
  { code: "703", name: "Chartreuse", rgb: [123, 181, 71] },
  { code: "699", name: "Green", rgb: [5, 101, 23] },
  { code: "930", name: "Antique Blue - Dark", rgb: [69, 92, 113] },
  { code: "931", name: "Antique Blue - Medium", rgb: [115, 138, 156] },
  { code: "932", name: "Antique Blue - Light", rgb: [162, 181, 195] },
  { code: "3756", name: "Baby Blue - Ultra Very Light", rgb: [238, 252, 252] },
  { code: "797", name: "Royal Blue", rgb: [19, 71, 125] },
  { code: "798", name: "Delft Blue - Dark", rgb: [70, 106, 142] },
  { code: "799", name: "Delft Blue - Medium", rgb: [116, 142, 182] },
  { code: "800", name: "Delft Blue - Pale", rgb: [192, 204, 222] },
  { code: "996", name: "Electric Blue - Medium", rgb: [48, 194, 236] },
  { code: "995", name: "Electric Blue - Dark", rgb: [0, 123, 167] },
  { code: "3843", name: "Electric Blue", rgb: [20, 170, 208] },
  { code: "3846", name: "Bright Turquoise", rgb: [6, 227, 230] },
  { code: "3812", name: "Seagreen - Dark", rgb: [47, 140, 132] },
  { code: "3811", name: "Turquoise - Light", rgb: [188, 227, 230] },
  { code: "3855", name: "Autumn Gold - Light", rgb: [250, 211, 150] },
  { code: "3856", name: "Mahogany - Light", rgb: [230, 160, 105] },
  { code: "3857", name: "Mahogany - Dark", rgb: [128, 72, 51] },
  { code: "437", name: "Tan - Light", rgb: [228, 187, 142] },
  { code: "436", name: "Tan", rgb: [203, 144, 81] },
  { code: "435", name: "Brown - Very Light", rgb: [184, 119, 72] },
  { code: "434", name: "Brown - Light", rgb: [152, 94, 51] },
  { code: "433", name: "Brown - Med", rgb: [122, 69, 31] },
  { code: "801", name: "Coffee Brown - Dark", rgb: [101, 57, 25] },
];

const SYMBOLS = [
  "@",
  "#",
  "$",
  "%",
  "&",
  "*",
  "+",
  "=",
  "?",
  "!",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "P",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hexFromRgb = (rgb) =>
  `#${rgb
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

function nearestColorIndex(r, g, b) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < DMC_PALETTE.length; i += 1) {
    const [pr, pg, pb] = DMC_PALETTE[i].rgb;
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

app.post("/api/coach", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    return;
  }

  const { focus, question, answer, tone } = req.body || {};
  if (!answer || !question || !focus) {
    res.status(400).json({ error: "Missing focus, question, or answer" });
    return;
  }
  if (String(answer).length > 800) {
    res.status(400).json({ error: "Answer is too long (max 800 characters)" });
    return;
  }

  try {
    const toneInstruction =
      tone === "hard"
        ? "Тон: прямой, уверенный, с добрым юмором."
        : "Тон: мягкий, поддерживающий, теплый.";
    const prompt = [
      "Ты — Зеркало Смыслов. Твоя задача: превратить короткий ответ пользователя в глубокую визуальную метафору.",
      "ПРАВИЛА (ответ только в JSON):",
      "1. interpretation: Напиши ОДНУ фразу, которая дает новую перспективу на ответ (без вопросов!).",
      "2. affirmation: Короткая мощная установка из 3-5 слов (например: 'Моя тишина — моя сила').",
      "3. color_hex: Один HEX-код цвета, который идеально передает это состояние (например: '#2c3e50').",
      "4. metaphor: Короткое описание образа (например: 'Океан в шторм, затихающий к рассвету').",
      toneInstruction,
      `Сфера: ${focus}`,
      `Ответ пользователя: ${answer}`,
      "Стиль: Минимализм, эстетика, глубина.",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 120,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(500).json({ error: data?.error?.message || "OpenAI error" });
      return;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!payload || typeof payload !== "object") {
      res.json({ text: text || "Пустой ответ от модели." });
      return;
    }
    res.json({
      interpretation: payload.interpretation,
      affirmation: payload.affirmation,
      color_hex: payload.color_hex,
      metaphor: payload.metaphor,
      text,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/pattern", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const rawSize = Number.parseInt(req.body?.gridSize || "90", 10);
  const gridSize = Number.isNaN(rawSize) ? 90 : clamp(rawSize, 30, 160);

  try {
    const { data, info } = await sharp(req.file.buffer)
      .resize({
        width: gridSize,
        height: gridSize,
        fit: "cover",
        kernel: "nearest",
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = info.width * info.height;
    const mappedIndex = new Array(pixelCount);
    const colorCounts = new Map();

    for (let i = 0; i < pixelCount; i += 1) {
      const base = i * 4;
      const r = data[base];
      const g = data[base + 1];
      const b = data[base + 2];
      const index = nearestColorIndex(r, g, b);
      mappedIndex[i] = index;
      colorCounts.set(index, (colorCounts.get(index) || 0) + 1);
    }

    const usedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([index, count]) => ({
        ...DMC_PALETTE[index],
        count,
        index,
      }));

    if (usedColors.length > SYMBOLS.length) {
      res.status(400).json({
        error: "Too many colors in the result. Try a smaller grid size or simpler image.",
      });
      return;
    }

    const palette = usedColors.map((color, idx) => ({
      code: color.code,
      name: color.name,
      rgb: color.rgb,
      hex: hexFromRgb(color.rgb),
      count: color.count,
      symbol: SYMBOLS[idx],
    }));

    const symbolByIndex = new Map(
      usedColors.map((color, idx) => [color.index, SYMBOLS[idx]])
    );

    const previewBuffer = Buffer.alloc(pixelCount * 3);
    for (let i = 0; i < pixelCount; i += 1) {
      const color = DMC_PALETTE[mappedIndex[i]].rgb;
      const base = i * 3;
      previewBuffer[base] = color[0];
      previewBuffer[base + 1] = color[1];
      previewBuffer[base + 2] = color[2];
    }

    const previewPng = await sharp(previewBuffer, {
      raw: { width: info.width, height: info.height, channels: 3 },
    })
      .png()
      .toBuffer();

    const cellSize = 12;
    const widthPx = info.width * cellSize;
    const heightPx = info.height * cellSize;
    const gridLines = [];
    for (let x = 0; x <= info.width; x += 1) {
      const pos = x * cellSize;
      gridLines.push(`M ${pos} 0 L ${pos} ${heightPx}`);
    }
    for (let y = 0; y <= info.height; y += 1) {
      const pos = y * cellSize;
      gridLines.push(`M 0 ${pos} L ${widthPx} ${pos}`);
    }

    const textElements = [];
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const index = mappedIndex[y * info.width + x];
        const symbol = symbolByIndex.get(index) || "?";
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;
        textElements.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${
            cellSize * 0.65
          }" font-family="monospace" fill="#111">${escapeXml(symbol)}</text>`
        );
      }
    }

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`,
      `<rect width="100%" height="100%" fill="#ffffff" />`,
      `<path d="${gridLines.join(" ")}" stroke="#d7d7d7" stroke-width="1" />`,
      textElements.join(""),
      "</svg>",
    ].join("");

    res.json({
      width: info.width,
      height: info.height,
      palette,
      previewDataUrl: `data:image/png;base64,${previewPng.toString("base64")}`,
      patternSvgDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Image processing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

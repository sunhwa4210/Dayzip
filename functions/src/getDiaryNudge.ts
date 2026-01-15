import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

export const getDiaryNudge = onRequest(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 60,
    cors: true,
  },
  async (req, res) => {
    try {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

      const userText = req.body?.text ?? "";
      if (!userText.trim()) {
        res.status(400).json({ ok: false, error: "빈 텍스트입니다." });
        return;
      }

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "너는 일기를 작성할 때 사용자에게 다음 문장을 제안하는 AI야. 13글자 이내로 짧고 따옴표 없이 감정적이거나 창의적인 제안을 해.",
          },
          { role: "user", content: userText },
        ],
      });

      const message = completion.choices[0]?.message?.content ?? "응답 없음";
      res.json({ ok: true, message });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        ok: false,
        error: err.message ?? "서버 오류 발생",
      });
    }
  }
);

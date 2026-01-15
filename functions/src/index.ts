// functions/src/index.ts
import { createHash } from "crypto";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";

type DalleGenResponse = {
    data: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;
  };

// --- Firebase Admin 초기화 ---
if (!admin.apps.length) admin.initializeApp();

// --- 시크릿 (GPT / DALL·E 분리) ---
const OPENAI_API_KEY_GPT   = defineSecret("OPENAI_API_KEY_GPT");
const OPENAI_API_KEY_DALLE = defineSecret("OPENAI_API_KEY_DALLE");

// --- 유틸: 문자열 해시(내용 변경 감지용) ---
const hash = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/**
 * 1) 일기 -> DALL·E 프롬프트 생성(GPT) -> 이미지 생성(DALL·E)
 *    반환: { imageUrl, prompt }
 */
export const generateDiaryImage = onCall(
  {
    region: "asia-northeast3", // 서울
    secrets: [OPENAI_API_KEY_GPT, OPENAI_API_KEY_DALLE],
    timeoutSeconds: 60,
  },
  async (req) => {
    const userText = String(req.data?.userText ?? "");
    if (!userText) {
      throw new HttpsError("invalid-argument", "userText가 필요합니다.");
    }

    try {
      // 1) GPT 키로 DALL·E용 영어 프롬프트 생성
      const gpt = new OpenAI({ apiKey: OPENAI_API_KEY_GPT.value() });
      const chat = await gpt.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              "다음 이야기를 바탕으로 DALL·E 3에 쓸 수 있는 간결하고 감성적인 영어 prompt를 만들어줘. 너무 길지 않게.",
              "캐릭터는 귀엽고 노란색 동그란 캐릭터(동글동글한 팔다리, 볼에 약간의 홍조), 2D 만화 스타일.",
              "텍스트는 포함하지 마.",
              `Diary: "${userText}"`,
            ].filter(Boolean).join("\n"),
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      // ✅ 여기서 프롬프트 찍기
      console.log("🧠 [GPT로 보낸 프롬프트] ======================");
      console.log(chat);
      console.log("============================================");


      const prompt = chat.choices?.[0]?.message?.content?.trim();
      if (!prompt) throw new HttpsError("internal", "프롬프트 생성 실패");

      // 2) DALL·E 키로 이미지 생성 (Node 18+는 fetch 내장)
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY_DALLE.value()}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("DALL·E error:", text);
        throw new HttpsError("internal", "이미지 생성 실패");
      }

      const data = (await res.json()) as DalleGenResponse;
      const imageUrl: string | undefined = data?.data?.[0]?.url;
      if (!imageUrl) throw new HttpsError("internal", "이미지 URL 없음");

      return { imageUrl, prompt };
    } catch (e) {
      console.error(e);
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "서버 오류");
    }
  }
);

/**
 * 2) 일기 작성 힌트(13글자 이내) 생성
 *    요청: { text }
 *    반환: { text }
 */
export const getDiaryNudge = onCall(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY_GPT],
    timeoutSeconds: 30,
  },
  async (req) => {
    const text = String(req.data?.text ?? "");
    if (!text) throw new HttpsError("invalid-argument", "text가 필요합니다.");

    try {
      const gpt = new OpenAI({ apiKey: OPENAI_API_KEY_GPT.value() });

      const chat = await gpt.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 60,
        messages: [
          {
            role: "system",
            content:
              "일기를 작성하다가 어려운 점이 있을 때 질문을 주는 역할이야. 일기를 작성하는 유저의 일기 내용을 보고 다음 문장을 유도하는거야. 13글자 이내로 다양하게. 따옴표는 없이.",
          },
          { role: "user", content: text },
        ],
      });

      let out = chat.choices?.[0]?.message?.content?.trim() ?? "";
      if (out.length > 13) out = out.slice(0, 13); // 안전 가위

      return { text: out || "조금만 더 써볼까요" };
    } catch (e) {
      console.error(e);
      throw new HttpsError("internal", "힌트 생성에 실패했습니다.");
    }
  }
);

/**
 * 3) 일기 코멘트 생성 + 캐시(저장)
 *    요청: { diaryId?: string, content?: string }
 *    - diaryId가 있으면 해당 문서에 aiComment 저장(업서트)
 *    - content만 있으면 생성해서 반환(저장은 생략)
 *    반환: { aiComment, cached, meta }
 */
export const upsertDiaryAIComment = onCall(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY_GPT],
    timeoutSeconds: 60,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const diaryId = (req.data?.diaryId ?? "").toString();
    const directContent = req.data?.content as string | undefined;
    if (!diaryId && !directContent) {
      throw new HttpsError("invalid-argument", "diaryId 또는 content가 필요합니다.");
    }

    const db = admin.firestore();

    // 1) content 확보
    let content: string;
    if (directContent) {
      content = directContent;
    } else {
      const ref = db.collection("users").doc(uid).collection("diaries").doc(diaryId);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError("not-found", "일기 문서를 찾을 수 없습니다.");
      content = String(snap.get("content") ?? "");
    }
    if (!content.trim()) throw new HttpsError("invalid-argument", "content가 비어 있습니다.");

    const contentHash = hash(content);

    // 2) 캐시 확인 (내용이 동일하면 기존 코멘트 재사용)
    if (diaryId) {
      const ref = db.collection("users").doc(uid).collection("diaries").doc(diaryId);
      const snap = await ref.get();
      const cached = snap.exists ? (snap.data() as any) : undefined;
      const meta = cached?.aiCommentMeta as { contentHash?: string } | undefined;
      if (cached?.aiComment && meta?.contentHash === contentHash) {
        return { aiComment: cached.aiComment, cached: true, meta: cached.aiCommentMeta };
      }
    }

    // 3) OpenAI 호출 (짧고 따뜻한 코멘트)
    const client = new OpenAI({ apiKey: OPENAI_API_KEY_GPT.value() });
    const system =
      "너는 일기 코멘트 어시스턴트야. 사용자의 일기를 읽고 1~2문장으로 공감+관찰+부드러운 제안을 한국어로 제공해. 80자 이내, 가볍고 따뜻하게.";
    const user =
      `일기 내용:\n${content}\n\n요청: 지나친 판단/설교 없이, 독자의 입장에서 공감하며 짧게 코멘트를 써줘.`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const aiComment =
      resp.choices?.[0]?.message?.content?.trim() || "오늘의 마음을 잘 적어주셨어요.";

    // 4) 저장(업서트) — diaryId가 있는 경우에만 저장
    if (diaryId) {
      const ref = db.collection("users").doc(uid).collection("diaries").doc(diaryId);
      await ref.set(
        {
          aiComment,
          aiCommentMeta: {
            model: "gpt-4o-mini",
            contentHash,
            version: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    }

    return { aiComment, cached: false, meta: { model: "gpt-4o-mini", contentHash } };
  }
);

type DiaryCommentInput = {
    dateISO: string; // "2025-08-24" 형태 날짜
    content?: string | null;
    emotion?: string | null;
    hashtag?: string | null; // 예: "#대전"
    };
    
    
export async function getDiaryComment(input: DiaryCommentInput): Promise<string> {
    const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!key) throw new Error('OpenAI API 키가 없습니다. EXPO_PUBLIC_OPENAI_API_KEY를 설정하세요.');
    
    
    const { dateISO, content, emotion, hashtag } = input;
    
    
    if (!content || !content.trim()) {
    return '아직 이 날의 일기가 없네요. 오늘의 순간을 한두 줄로 남겨보는 건 어떨까요?';
    }
    
    
    const system = `당신은 감정 일기 코치입니다. 한국어로 1~2문장, 140자 이내로 따뜻하고 공감 있게 질문 코멘트를 만듭니다.\n금지: 너무 훈계, 진단, 민감한 조언. 형식: 이모지 0~1개, 말투 공손하지만 가볍게.`;
    const user = [
    `날짜: ${dateISO}`,
    emotion ? `감정: ${emotion}` : null,
    hashtag ? `태그: ${hashtag}` : null,
    `본문: """${content.trim()}"""`
    ].filter(Boolean).join('\n');
    
    
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    },
    body: JSON.stringify({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
    { role: 'system', content: system },
    { role: 'user', content: user }
    ],
    }),
    });
    
    
    if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`OpenAI 요청 실패: ${res.status} ${t}`);
    }
    
    
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || '오늘을 잘 지나오셨어요. 내일도 가볍게 한 걸음씩 가봐요.';
    }

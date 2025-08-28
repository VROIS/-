// services/geminiService.js
import { GoogleGenAI } from "@google/genai";

let ai = null;

/**
 * Gemini 서비스를 API 키로 초기화합니다.
 * @param {string} apiKey - 사용자의 Google Gemini API 키
 */
export function init(apiKey) {
    if (!apiKey) {
        console.error("Gemini API 키가 제공되지 않았습니다.");
        ai = null;
        return;
    }
    // GoogleGenAI 클래스를 사용하여 새 인스턴스를 생성합니다.
    ai = new GoogleGenAI({ apiKey });
}

/**
 * 서비스가 초기화되었는지 확인합니다.
 * @returns {boolean}
 */
export function isInitialized() {
    return !!ai;
}

/**
 * 이미지를 스트리밍 방식으로 분석하고 설명을 생성합니다.
 * @param {string} base64Image - Base64로 인코딩된 이미지 데이터
 * @returns {Promise<import("@google/genai").GenerateContentStreamResult>}
 */
export async function generateDescriptionStream(base64Image) {
    if (!isInitialized()) throw new Error("Gemini 서비스가 초기화되지 않았습니다. API 키를 확인해주세요.");

    const model = 'gemini-2.5-flash';
    const contents = {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "이 이미지를 분석하고 한국어로 생생하게 설명해주세요." }
        ]
    };
    const config = {
        systemInstruction: `당신은 세계 최고의 여행 가이드 도슨트입니다. 제공된 이미지를 분석하여, 한국어로 생생하게 설명해주세요.

[분석 유형별 가이드라인]
• 미술작품: 작품명, 작가, 시대적 배경, 예술적 특징, 감상 포인트
• 건축/풍경: 명칭, 역사적 의의, 건축 양식, 특징, 방문 팁
• 음식: 음식명, 특징, 유래, 맛의 특징, 추천 사항

[출력 규칙]
- 자연스러운 나레이션 형식으로 작성
- 1분 내외의 음성 해설에 적합한 길이
- 전문 용어는 쉽게 풀어서 설명
- 흥미로운 일화나 배경 지식 포함
- 분석 과정, 기호, 번호 등은 제외하고 순수한 설명문만 출력
- 절대로 마크다운 강조 기호(\`**\`, \`*\` 등)를 사용하지 마세요.`,
    };

    return ai.models.generateContentStream({ model, contents, config });
}

/**
 * 텍스트 프롬프트를 스트리밍 방식으로 처리하고 답변을 생성합니다.
 * @param {string} prompt - 사용자의 텍스트 질문
 * @returns {Promise<import("@google/genai").GenerateContentStreamResult>}
 */
export async function generateTextStream(prompt) {
    if (!isInitialized()) throw new Error("Gemini 서비스가 초기화되지 않았습니다. API 키를 확인해주세요.");

    const model = 'gemini-2.5-flash';
    const contents = prompt;
    const config = {
        systemInstruction: `당신은 세계 최고의 여행 가이드 도슨트입니다. 사용자의 질문에 대해, 한국어로 친절하고 상세하게 설명해주세요. 여행과 관련없는 질문이라도 최선을 다해 답변해주세요.

[출력 규칙]
- 자연스러운 나레이션 형식으로 작성
- 1분 내외의 음성 해설에 적합한 길이
- 전문 용어는 쉽게 풀어서 설명
- 흥미로운 일화나 배경 지식 포함
- 분석 과정, 기호, 번호 등은 제외하고 순수한 설명문만 출력
- 절대로 마크다운 강조 기호(\`**\`, \`*\` 등)를 사용하지 마세요.`,
    };

    return ai.models.generateContentStream({ model, contents, config });
}

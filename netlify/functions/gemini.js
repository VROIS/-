
import { GoogleGenAI } from "@google/genai";

export const handler = async (event) => {
    // POST 요청만 허용합니다.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: '허용되지 않은 메소드입니다.' };
    }

    // Netlify 환경 변수에 API 키가 설정되어 있는지 확인합니다.
    if (!process.env.API_KEY) {
        console.error('API_KEY 환경 변수가 설정되지 않았습니다.');
        return { statusCode: 500, body: JSON.stringify({ error: '서버 설정 오류입니다.' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const { prompt, base64Image, systemInstruction } = JSON.parse(event.body);

        const contents = { parts: [] };
        if (base64Image) {
            contents.parts.push({
                inlineData: { mimeType: 'image/jpeg', data: base64Image },
            });
        }
        if (prompt) {
            contents.parts.push({ text: prompt });
        }

        // Netlify Functions는 ReadableStream을 반환하여 스트리밍 응답을 지원합니다.
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const responseStream = await ai.models.generateContentStream({
                        model: 'gemini-2.5-flash',
                        contents: contents,
                        config: {
                            systemInstruction: systemInstruction,
                        }
                    });

                    for await (const chunk of responseStream) {
                        const text = chunk.text;
                        if (text) {
                            // 프론트엔드가 기대하는 Server-Sent Events (SSE) 형식으로 데이터를 포장합니다.
                            const ssePayload = { text: text };
                            const sseString = `data: ${JSON.stringify(ssePayload)}\n\n`;
                            controller.enqueue(encoder.encode(sseString));
                        }
                    }
                } catch (e) {
                    console.error("Gemini 스트림 생성 중 오류 발생:", e);
                    const errorPayload = { error: 'AI로부터 응답을 생성하는 데 실패했습니다.' };
                    const sseString = `data: ${JSON.stringify(errorPayload)}\n\n`;
                    controller.enqueue(encoder.encode(sseString));
                } finally {
                    // 스트림이 끝나면 컨트롤러를 닫습니다.
                    controller.close();
                }
            }
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
            body: stream,
        };

    } catch (error) {
        console.error('요청 분석 또는 스트림 설정 중 오류 발생:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '잘못된 요청 본문입니다.' }),
        };
    }
};
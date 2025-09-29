// Netlify의 공식 스트리밍 핸들러와 Google GenAI SDK를 가져옵니다.
const { stream } = require("@netlify/functions");
const { GoogleGenAI } = require("@google/genai");

// Netlify의 stream() 함수로 전체 핸들러를 감싸서 스트리밍을 활성화합니다.
exports.handler = stream(async (event) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다!");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "서버에 API 키가 설정되지 않았습니다. 관리자에게 문의해주세요." }),
    };
  }

  try {
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `잘못된 요청 형식입니다: ${parseError.message}` }),
      };
    }
    
    const { base64Image, prompt, systemInstruction } = requestData;

    const isPromptEmpty = !prompt || prompt.trim() === '';
    const isImageEmpty = !base64Image;

    if (isPromptEmpty && isImageEmpty) {
      console.error("필수 데이터 누락: prompt 또는 base64Image가 없습니다.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "요청 본문에 필수 데이터(prompt 또는 base64Image)가 누락되었습니다." }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let parts = [];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }

    if (prompt && prompt.trim() !== '') {
      parts.push({ text: prompt });
    }

    const model = 'gemini-2.5-flash';
    const contents = { parts };

    // 핵심 기능인 속도 최적화 옵션을 그대로 유지합니다.
    const config = {
      systemInstruction,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    };

    console.log("Gemini API(스트리밍)로 전송할 요청 본문:", JSON.stringify({ model, contents, config }));

    const responseStream = await ai.models.generateContentStream({ model, contents, config });

    // [핵심 변경] Google AI 스트림을 Netlify가 이해할 수 있는 ReadableStream으로 변환합니다.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 비동기 함수로 Gemini 스트림을 읽어 Netlify 스트림으로 데이터를 씁니다.
    (async () => {
      try {
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            writer.write(encoder.encode(text));
          }
        }
      } catch (error) {
        console.error("스트림 처리 중 오류:", error);
        writer.write(encoder.encode(`\n[오류 발생: ${error.message}]`));
      } finally {
        writer.close();
      }
    })();

    // Netlify stream 핸들러에 최종 응답 객체를 반환합니다.
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: readable, // body에 ReadableStream 자체를 전달합니다.
    };

  } catch (error) {
    console.error("Netlify 함수 오류:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `AI 통신 중 오류: ${error.message}` }),
    };
  }
});
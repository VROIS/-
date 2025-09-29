
// netlify/functions/share.js

// Netlify Blob Storage와 상호작용하기 위한 공식 라이브러리를 가져옵니다.
// 이 기능을 사용하려면 package.json에 "@netlify/blobs"를 추가해야 합니다.
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

exports.handler = async (event) => {
  // 'guidebooks'라는 이름의 Blob Storage(공공 도서관)를 사용합니다.
  const store = getStore("guidebooks");

  try {
    // --- 가이드북 생성 (POST 요청) ---
    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "잘못된 요청 형식입니다." }) };
      }

      const { contentIds } = body;

      // contentIds가 배열이고, 비어있지 않은지 확인합니다.
      if (!Array.isArray(contentIds) || contentIds.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "공유할 항목이 없습니다." }) };
      }
      
      // 사용자 경험을 위해 최대 30개로 한도를 설정합니다.
      if (contentIds.length > 30) {
        return { statusCode: 400, body: JSON.stringify({ error: "한 번에 최대 30개까지만 공유할 수 있습니다." }) };
      }

      // 짧고 예측 불가능한 고유 ID를 생성합니다. (예: 'aB3xZ9')
      const guidebookId = crypto.randomBytes(4).toString('base64url').slice(0, 6);

      // Blob Storage에 '가이드북 ID'를 키로, '콘텐츠 ID 목록'을 값으로 저장합니다.
      await store.setJSON(guidebookId, { contentIds, createdAt: new Date().toISOString() });
      
      // 성공적으로 생성된 '가이드북 ID'를 클라이언트에게 반환합니다.
      return {
        statusCode: 200,
        body: JSON.stringify({ guidebookId }),
      };
    }

    // --- 가이드북 조회 (GET 요청) ---
    if (event.httpMethod === "GET") {
      const guidebookId = event.queryStringParameters.id;

      if (!guidebookId) {
        return { statusCode: 400, body: JSON.stringify({ error: "가이드북 ID가 필요합니다." }) };
      }

      // Blob Storage에서 '가이드북 ID'에 해당하는 데이터를 조회합니다.
      const guidebookData = await store.get(guidebookId, { type: "json" });

      if (!guidebookData) {
        return { statusCode: 404, body: JSON.stringify({ error: "해당 가이드북을 찾을 수 없습니다." }) };
      }
      
      // 조회된 '콘텐츠 ID 목록'을 클라이언트에게 반환합니다.
      return {
        statusCode: 200,
        body: JSON.stringify(guidebookData),
      };
    }

    // POST 또는 GET이 아닌 다른 모든 요청은 허용하지 않습니다.
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (error) {
    console.error("Share 함수 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "서버 내부 오류가 발생했습니다." }),
    };
  }
};

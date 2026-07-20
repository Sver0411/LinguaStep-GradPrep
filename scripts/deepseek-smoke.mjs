const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

if (!apiKey) {
  console.log("跳过 DeepSeek 冒烟测试：未设置 DEEPSEEK_API_KEY。");
  process.exit(0);
}

const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const model = process.env.DEEPSEEK_MODEL_FAST || "deepseek-v4-flash";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 45_000);

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "只输出合法 JSON 对象。" },
        { role: "user", content: "输出 {\"ok\":true}。" },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      max_tokens: 32,
      stream: false,
    }),
    signal: controller.signal,
  });
  if (!response.ok) throw new Error(`DeepSeek 返回 HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || JSON.parse(content).ok !== true) {
    throw new Error("DeepSeek 未返回预期的结构化 JSON。");
  }
  console.log(`DeepSeek 冒烟测试通过：${payload.model || model}。`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "DeepSeek 冒烟测试失败。");
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}

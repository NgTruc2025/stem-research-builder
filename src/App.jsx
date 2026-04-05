import { useState, useCallback, useRef, useEffect } from "react";
import "./index.css";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const FIELDS = [
  "Tin học & Công nghệ thông tin",
  "Vật lý & Kỹ thuật",
  "Hóa học & Vật liệu",
  "Sinh học & Môi trường",
  "Toán học & Thống kê",
  "Khoa học trái đất & Khí hậu",
  "Y học & Sức khỏe cộng đồng",
  "Kinh tế & Xã hội học",
];

const PROBLEMS = [
  "Ô nhiễm môi trường",
  "Giao thông đô thị",
  "Giáo dục số hóa",
  "An ninh mạng",
  "Năng lượng tái tạo",
  "Nông nghiệp thông minh",
  "Sức khỏe học đường",
  "Rác thải nhựa",
  "Biến đổi khí hậu",
  "Kinh tế số",
];

const STEPS = [
  { id: 1, icon: "💡", label: "Ý tưởng", short: "Idea" },
  { id: 2, icon: "🔍", label: "Phân tích", short: "Analyze" },
  { id: 3, icon: "⚗️", label: "Phương pháp", short: "Method" },
  { id: 4, icon: "🧪", label: "Thí nghiệm", short: "Experiment" },
  { id: 5, icon: "📊", label: "Dữ liệu", short: "Data" },
  { id: 6, icon: "📄", label: "Báo cáo", short: "Report" },
  { id: 7, icon: "🎯", label: "Trình bày", short: "Present" },
];

const MODELS = [
  { id: "gemini", label: "Gemini (Google)", description: "Miễn phí, nhanh" },
  { id: "claude", label: "Claude (Anthropic)", description: "Chất lượng cao" },
];

const GEMINI_MODELS = [
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", description: "Nhanh, nhẹ, quota riêng" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Cân bằng tốc độ & chất lượng" },
  { id: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash", description: "Mới nhất, thông minh" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Ổn định, quota cao" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Chất lượng cao nhất" },
];

// ─── API CALLS ───────────────────────────────────────────────────────────────
async function callGeminiWithModel(apiKey, modelId, systemPrompt, userPrompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.8 },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini API error: ${response.status}`;
    const status = response.status;
    const error = new Error(msg);
    // Mark retryable errors: quota (429), server errors (500+), not found (404)
    error.isRetryable = status === 429 || status >= 500 || status === 404
      || msg.toLowerCase().includes("quota")
      || msg.toLowerCase().includes("rate")
      || msg.toLowerCase().includes("not found")
      || msg.toLowerCase().includes("not supported");
    error.isAuthError = status === 400 || status === 401 || status === 403;
    error.model = modelId;
    error.status = status;
    throw error;
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error(`Model ${modelId} trả về kết quả trống. Có thể do nội dung bị chặn bởi safety filter.`);
  }
  return text;
}

async function callGemini(apiKey, selectedModel, systemPrompt, userPrompt, onChunk, onModelSwitch) {
  // Build fallback chain: selected model first, then others
  const allModels = GEMINI_MODELS.map(m => m.id);
  const fallbackChain = [selectedModel, ...allModels.filter(m => m !== selectedModel)];
  
  const errors = [];
  for (const modelId of fallbackChain) {
    try {
      if (modelId !== selectedModel && onModelSwitch) {
        onModelSwitch(modelId);
      }
      console.log(`[SRB] Trying model: ${modelId}`);
      const text = await callGeminiWithModel(apiKey, modelId, systemPrompt, userPrompt);
      onChunk(text);
      return text;
    } catch (err) {
      errors.push({ model: modelId, error: err.message, status: err.status });
      console.warn(`[SRB] ${modelId} failed (${err.status}): ${err.message}`);
      
      // Auth errors (invalid API key) → don't try other models
      if (err.isAuthError) {
        throw new Error(`API Key không hợp lệ hoặc không có quyền. Vui lòng kiểm tra lại API Key.\n\nChi tiết: ${err.message}`);
      }
      
      // Retryable errors → try next model
      if (err.isRetryable) {
        continue;
      }
      
      // Unknown errors → also try next model (better safe than sorry)
      continue;
    }
  }
  
  // All models exhausted — build detailed error message
  const modelSummary = errors.map(e => `• ${e.model}: ${e.error.slice(0, 80)}`).join("\n");
  throw new Error(
    `Tất cả ${errors.length} model Gemini đều không khả dụng.\n\nCó thể do:\n• Quota miễn phí đã hết → đợi vài phút rồi thử lại\n• API Key chưa kích hoạt billing\n\n📋 Chi tiết:\n${modelSummary}`
  );
}

async function callClaude(apiKey, systemPrompt, userPrompt, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === "content_block_delta" && json.delta?.text) {
          fullText += json.delta.text;
          onChunk(fullText);
        }
      } catch {}
    }
  }
  return fullText;
}

async function callAI(provider, apiKey, geminiModel, systemPrompt, userPrompt, onChunk, onModelSwitch) {
  if (provider === "gemini") {
    return callGemini(apiKey, geminiModel, systemPrompt, userPrompt, onChunk, onModelSwitch);
  }
  return callClaude(apiKey, systemPrompt, userPrompt, onChunk);
}

// ─── MARKDOWN RENDERER ──────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="md-code-block"><code class="md-code-lang" data-lang="$1">$2</code></pre>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-bold">$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>');
  // Line breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

// ─── PROJECT STATE ────────────────────────────────────────────────────────────
const initialProject = {
  field: "",
  problem: "",
  selectedTopic: "",
  customTopic: "",
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState(initialProject);
  const [aiOutput, setAiOutput] = useState({});
  const [loading, setLoading] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [errors, setErrors] = useState({});

  // API settings
  const [showSettings, setShowSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("srb_provider") || "gemini");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("srb_apikey") || "");
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem("srb_gemini_model") || "gemini-2.0-flash-lite");
  const [showKey, setShowKey] = useState(false);
  const [activeModel, setActiveModel] = useState(""); // shows which model is currently being used

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const setField = (key, val) => setProject((p) => ({ ...p, [key]: val }));
  const setOutput = (key, val) => setAiOutput((o) => ({ ...o, [key]: val }));
  const setLoad = (key, val) => setLoading((l) => ({ ...l, [key]: val }));
  const setError = (key, val) => setErrors((e) => ({ ...e, [key]: val }));

  const markDone = (step) => setCompletedSteps((s) => new Set([...s, step]));

  // Save settings
  const saveSettings = () => {
    localStorage.setItem("srb_provider", aiProvider);
    localStorage.setItem("srb_apikey", apiKey);
    localStorage.setItem("srb_gemini_model", geminiModel);
    setShowSettings(false);
    showToast("Đã lưu cài đặt API!", "success");
  };

  const checkApiKey = () => {
    if (!apiKey) {
      setShowSettings(true);
      showToast("Vui lòng nhập API Key trước!", "error");
      return false;
    }
    return true;
  };

  // Scroll to result
  const resultRef = useRef(null);
  useEffect(() => {
    if (resultRef.current && Object.keys(aiOutput).length > 0) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [aiOutput]);

  // Model switch handler for auto-fallback
  const handleModelSwitch = useCallback((newModel) => {
    setActiveModel(newModel);
    const modelInfo = GEMINI_MODELS.find(m => m.id === newModel);
    showToast(`Quota hết → chuyển sang ${modelInfo?.label || newModel}`, "success");
  }, []);

  // ── STEP 1: GENERATE IDEAS ──────────────────────────────────────────────────
  const generateIdeas = useCallback(async () => {
    if (!project.field || !checkApiKey()) return;
    setLoad("ideas", true);
    setOutput("ideas", "");
    setError("ideas", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là chuyên gia nghiên cứu khoa học kỹ thuật THPT Việt Nam. Hãy trả lời bằng tiếng Việt, ngắn gọn, thực tế.`,
        `Lĩnh vực: ${project.field}
Vấn đề thực tế: ${project.problem || "tổng quát"}

Hãy gợi ý 6 đề tài nghiên cứu khoa học kỹ thuật phù hợp học sinh THPT. 
Mỗi đề tài theo định dạng:
[STT]. [TÊN ĐỀ TÀI] | [DỄ/TRUNG BÌNH/KHÓ] | [một câu mô tả ngắn]

Ưu tiên tính ứng dụng thực tiễn cao, có thể làm được trong điều kiện học sinh THPT.`,
        (t) => setOutput("ideas", t),
        handleModelSwitch
      );
      markDone(1);
      showToast("Đã tạo gợi ý đề tài thành công!");
    } catch (err) {
      setError("ideas", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("ideas", false);
    }
  }, [project.field, project.problem, aiProvider, apiKey]);

  // ── STEP 2: ANALYZE PROBLEM ────────────────────────────────────────────────
  const analyzeProblem = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("analysis", true);
    setOutput("analysis", "");
    setError("analysis", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là cố vấn khoa học cho học sinh THPT Việt Nam. Trả lời bằng tiếng Việt, súc tích và chuẩn xác theo format được yêu cầu.`,
        `Đề tài: "${topic}"
Lĩnh vực: ${project.field}

Hãy phân tích đề tài theo cấu trúc sau:

**MỤC TIÊU NGHIÊN CỨU:**
(2-3 mục tiêu cụ thể)

**CÂU HỎI NGHIÊN CỨU:**
(2-3 câu hỏi chính)

**GIẢ THUYẾT KHOA HỌC:**
(1-2 giả thuyết có thể kiểm chứng)

**Ý NGHĨA THỰC TIỄN:**
(tác động thực tế)`,
        (t) => setOutput("analysis", t),
        handleModelSwitch
      );
      markDone(2);
      showToast("Phân tích hoàn tất!");
    } catch (err) {
      setError("analysis", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("analysis", false);
    }
  }, [project.selectedTopic, project.customTopic, project.field, aiProvider, apiKey]);

  // ── STEP 3: METHOD ──────────────────────────────────────────────────────────
  const suggestMethod = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("method", true);
    setOutput("method", "");
    setError("method", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là chuyên gia phương pháp nghiên cứu khoa học THPT. Trả lời bằng tiếng Việt.`,
        `Đề tài: "${topic}"
Lĩnh vực: ${project.field}

Đề xuất phương pháp nghiên cứu theo định dạng:

**PHƯƠNG PHÁP CHÍNH:**
(thực nghiệm / mô phỏng / khảo sát / phân tích dữ liệu...)

**CÔNG CỤ & CÔNG NGHỆ:**
(phần mềm, thiết bị, thư viện cần dùng)

**THUẬT TOÁN / KỸ THUẬT:**
(nếu Tin học: thuật toán cụ thể; nếu lĩnh vực khác: phương pháp đo lường)

**NGUỒN DỮ LIỆU:**
(cách thu thập dữ liệu)

**RỦI RO & GIẢI PHÁP:**
(2-3 rủi ro thường gặp và cách xử lý)`,
        (t) => setOutput("method", t),
        handleModelSwitch
      );
      markDone(3);
      showToast("Đề xuất phương pháp hoàn tất!");
    } catch (err) {
      setError("method", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("method", false);
    }
  }, [project.selectedTopic, project.customTopic, project.field, aiProvider, apiKey]);

  // ── STEP 4: EXPERIMENT ──────────────────────────────────────────────────────
  const designExperiment = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("experiment", true);
    setOutput("experiment", "");
    setError("experiment", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là giáo viên hướng dẫn thí nghiệm khoa học THPT. Trả lời tiếng Việt, chi tiết, thực tế.`,
        `Đề tài: "${topic}"
Phương pháp: ${aiOutput.method ? "đã xác định" : "chưa rõ"}

Thiết kế thí nghiệm / thực nghiệm:

**BIẾN SỐ:**
- Biến độc lập: 
- Biến phụ thuộc: 
- Biến kiểm soát: 

**QUY TRÌNH THỰC HIỆN:**
(các bước cụ thể, đánh số)

**BẢNG THU THẬP DỮ LIỆU:**
(tạo bảng mẫu với các cột phù hợp, dùng ký tự ASCII)

**TIÊU CHÍ ĐÁNH GIÁ:**
(khi nào thí nghiệm được coi là thành công)`,
        (t) => setOutput("experiment", t),
        handleModelSwitch
      );
      markDone(4);
      showToast("Thiết kế thí nghiệm hoàn tất!");
    } catch (err) {
      setError("experiment", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("experiment", false);
    }
  }, [project.selectedTopic, project.customTopic, aiOutput.method, aiProvider, apiKey]);

  // ── STEP 5: DATA ANALYSIS ───────────────────────────────────────────────────
  const analyzeData = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("data", true);
    setOutput("data", "");
    setError("data", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là chuyên gia phân tích dữ liệu và thống kê cho dự án nghiên cứu THPT. Trả lời tiếng Việt.`,
        `Đề tài: "${topic}"
Lĩnh vực: ${project.field}

Hướng dẫn phân tích dữ liệu:

**PHƯƠNG PHÁP THỐNG KÊ ĐỀ XUẤT:**
(trung bình, độ lệch chuẩn, tương quan, hồi quy...)

**BIỂU ĐỒ CẦN VẼ:**
(loại biểu đồ phù hợp và ý nghĩa từng loại)

**MÃ PYTHON MẪU:**
\`\`\`python
# Phân tích dữ liệu cho đề tài
import pandas as pd
import matplotlib.pyplot as plt
# ... (viết code mẫu thực tế, khoảng 15-20 dòng)
\`\`\`

**CÁCH ĐỌC KẾT QUẢ:**
(giải thích các chỉ số quan trọng)`,
        (t) => setOutput("data", t),
        handleModelSwitch
      );
      markDone(5);
      showToast("Hướng dẫn phân tích hoàn tất!");
    } catch (err) {
      setError("data", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("data", false);
    }
  }, [project.selectedTopic, project.customTopic, project.field, aiProvider, apiKey]);

  // ── STEP 6: REPORT ──────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("report", true);
    setOutput("report", "");
    setError("report", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là chuyên gia viết báo cáo khoa học THPT theo chuẩn thi Khoa học kỹ thuật Quốc gia Việt Nam. Trả lời tiếng Việt.`,
        `Đề tài: "${topic}"
Lĩnh vực: ${project.field}
Mục tiêu đã phân tích: ${aiOutput.analysis ? "có" : "chưa có"}

Tạo khung báo cáo nghiên cứu khoa học kỹ thuật đầy đủ:

# BÁO CÁO NGHIÊN CỨU KHOA HỌC
## "${topic}"

**I. LÝ DO CHỌN ĐỀ TÀI**
(viết đoạn văn 80-100 chữ)

**II. MỤC TIÊU VÀ NHIỆM VỤ NGHIÊN CỨU**
(dựa trên phân tích)

**III. PHƯƠNG PHÁP NGHIÊN CỨU**
(tóm tắt phương pháp)

**IV. NỘI DUNG NGHIÊN CỨU**
(cấu trúc các chương chính)

**V. KẾT QUẢ DỰ KIẾN**
(mô tả kết quả có thể đạt được)

**VI. KẾT LUẬN VÀ KIẾN NGHỊ**
(kết luận và hướng phát triển)

**TÀI LIỆU THAM KHẢO:**
(5-7 nguồn tài liệu mẫu phù hợp)`,
        (t) => setOutput("report", t),
        handleModelSwitch
      );
      markDone(6);
      showToast("Báo cáo khoa học hoàn tất!");
    } catch (err) {
      setError("report", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("report", false);
    }
  }, [project.selectedTopic, project.customTopic, project.field, aiOutput.analysis, aiProvider, apiKey]);

  // ── STEP 7: PRESENTATION ────────────────────────────────────────────────────
  const buildPresentation = useCallback(async () => {
    const topic = project.selectedTopic || project.customTopic;
    if (!topic || !checkApiKey()) return;
    setLoad("presentation", true);
    setOutput("presentation", "");
    setError("presentation", null);
    try {
      await callAI(
        aiProvider,
        apiKey,
        geminiModel,
        `Bạn là chuyên gia thiết kế slide thuyết trình khoa học cho học sinh THPT Việt Nam. Trả lời tiếng Việt.`,
        `Đề tài: "${topic}"
Lĩnh vực: ${project.field}

Tạo kịch bản slide thuyết trình (10-12 slide) theo chuẩn hội đồng khoa học:

**SLIDE 1 - TRANG BÌA**
Tiêu đề, tên nhóm, trường, năm học

**SLIDE 2 - MỤC LỤC**
...

**SLIDE 3 - LÝ DO CHỌN ĐỀ TÀI**
Nội dung chính + hình ảnh minh họa gợi ý

**SLIDE 4-5 - CƠ SỞ LÝ LUẬN**
...

**SLIDE 6-7 - PHƯƠNG PHÁP & QUY TRÌNH**
...

**SLIDE 8-9 - KẾT QUẢ & PHÂN TÍCH**
...

**SLIDE 10 - KẾT LUẬN**
...

**SLIDE 11 - KIẾN NGHỊ & HƯỚNG PHÁT TRIỂN**
...

**SLIDE 12 - CẢM ƠN & Q&A**

Với mỗi slide: ghi rõ nội dung chính (bullet points), màu sắc đề xuất, loại biểu đồ/hình ảnh phù hợp.`,
        (t) => setOutput("presentation", t),
        handleModelSwitch
      );
      markDone(7);
      showToast("Kịch bản trình bày hoàn tất!");
    } catch (err) {
      setError("presentation", err.message);
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoad("presentation", false);
    }
  }, [project.selectedTopic, project.customTopic, project.field, aiProvider, apiKey]);

  // ── EXPORT FUNCTIONS ────────────────────────────────────────────────────────
  const exportTXT = () => {
    const topic = project.selectedTopic || project.customTopic;
    const content = Object.entries(aiOutput)
      .map(([k, v]) => `\n${"=".repeat(50)}\n${k.toUpperCase()}\n${"=".repeat(50)}\n${v}`)
      .join("\n");
    const blob = new Blob(
      [`ĐỀ TÀI: ${topic}\nLĨNH VỰC: ${project.field}\n${content}`],
      { type: "text/plain;charset=utf-8" }
    );
    downloadBlob(blob, `STEM_${(topic || "de_tai").slice(0, 30)}.txt`);
    showToast("Đã xuất file TXT!");
  };

  const exportHTML = () => {
    const topic = project.selectedTopic || project.customTopic;
    const sections = Object.entries(aiOutput)
      .map(([k, v]) => `<section><h2>${k.toUpperCase()}</h2><div>${renderMarkdown(v)}</div></section>`)
      .join("\n");
    const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${topic} - STEM Research</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.8;color:#1a1a2e;background:#fafafa}
h1{color:#e8a020;border-bottom:3px solid #e8a020;padding-bottom:12px}h2{color:#2d3436;margin-top:40px;border-left:4px solid #4ecdc4;padding-left:12px}
pre{background:#1a1a2e;color:#d4dff0;padding:16px;border-radius:8px;overflow-x:auto}code{font-family:'Fira Code',monospace}
strong{color:#e8a020}.md-h2,.md-h3,.md-h4{margin-top:20px;color:#2d3436}
section{margin-bottom:32px;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
</style></head><body>
<h1>🔬 ${topic}</h1><p><strong>Lĩnh vực:</strong> ${project.field}</p>
${sections}
<footer style="text-align:center;margin-top:60px;color:#999;font-size:13px">Generated by STEM Research Builder</footer>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `STEM_${(topic || "de_tai").slice(0, 30)}.html`);
    showToast("Đã xuất file HTML!");
  };

  const exportMarkdown = () => {
    const topic = project.selectedTopic || project.customTopic;
    const content = Object.entries(aiOutput)
      .map(([k, v]) => `\n---\n\n## ${k.toUpperCase()}\n\n${v}`)
      .join("\n");
    const md = `# 🔬 ${topic}\n\n**Lĩnh vực:** ${project.field}\n${content}\n\n---\n*Generated by STEM Research Builder*`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `STEM_${(topic || "de_tai").slice(0, 30)}.md`);
    showToast("Đã xuất file Markdown!");
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PARSE TOPICS from ideas text ────────────────────────────────────────────
  const parsedTopics = (aiOutput.ideas || "")
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .slice(0, 8);

  const getCurrentTopic = () => project.selectedTopic || project.customTopic;

  // ── RENDER SETTINGS MODAL ──────────────────────────────────────────────────
  const renderSettings = () => (
    <div className="srb-modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="srb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="srb-modal-header">
          <h3>⚙️ Cài đặt API</h3>
          <button className="srb-modal-close" onClick={() => setShowSettings(false)}>✕</button>
        </div>
        <div className="srb-modal-body">
          <div className="srb-form-group">
            <label className="srb-label">AI Provider</label>
            <div className="srb-provider-grid">
              {MODELS.map((m) => (
                <div
                  key={m.id}
                  className={`srb-provider-card ${aiProvider === m.id ? "active" : ""}`}
                  onClick={() => setAiProvider(m.id)}
                >
                  <div className="srb-provider-name">{m.label}</div>
                  <div className="srb-provider-desc">{m.description}</div>
                </div>
              ))}
            </div>
          </div>
          {aiProvider === "gemini" && (
            <div className="srb-form-group">
              <label className="srb-label">Gemini Model</label>
              <div className="srb-model-grid">
                {GEMINI_MODELS.map((m) => (
                  <div
                    key={m.id}
                    className={`srb-provider-card ${geminiModel === m.id ? "active" : ""}`}
                    onClick={() => setGeminiModel(m.id)}
                  >
                    <div className="srb-provider-name">{m.label}</div>
                    <div className="srb-provider-desc">{m.description}</div>
                  </div>
                ))}
              </div>
              <div className="srb-help-text" style={{marginTop: 8}}>
                💡 Khi model chính hết quota, app sẽ <strong>tự động chuyển</strong> sang model khác.
              </div>
            </div>
          )}
          <div className="srb-form-group">
            <label className="srb-label">API Key</label>
            <div className="srb-key-input-wrap">
              <input
                className="srb-input"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={aiProvider === "gemini" ? "Nhập Gemini API Key..." : "Nhập Claude API Key..."}
              />
              <button className="srb-key-toggle" onClick={() => setShowKey(!showKey)}>
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
            <div className="srb-help-text">
              {aiProvider === "gemini" ? (
                <>Lấy API Key miễn phí tại <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a></>
              ) : (
                <>Lấy API Key tại <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">Anthropic Console</a></>
              )}
            </div>
          </div>
        </div>
        <div className="srb-modal-footer">
          <button className="btn-secondary" onClick={() => setShowSettings(false)}>Hủy</button>
          <button className="btn-primary" onClick={saveSettings}>💾 Lưu cài đặt</button>
        </div>
      </div>
    </div>
  );

  // ── RENDER ERROR ────────────────────────────────────────────────────────────
  const renderError = (key) => errors[key] ? (
    <div className="srb-error-box">
      <span className="srb-error-icon">⚠️</span>
      <div>
        <div className="srb-error-title">Có lỗi xảy ra</div>
        <div className="srb-error-msg">{errors[key]}</div>
      </div>
    </div>
  ) : null;

  // ── RENDER AI CONTENT ──────────────────────────────────────────────────────
  const renderAIContent = (key, label, isLoading) => (
    aiOutput[key] ? (
      <div className="srb-ai-box" ref={resultRef}>
        <div className="srb-ai-label">
          <div className={`srb-ai-dot ${isLoading ? "pulsing" : ""}`} />
          {label}
          {!isLoading && (
            <button
              className="srb-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput[key]);
                showToast("Đã copy vào clipboard!");
              }}
              title="Copy"
            >
              📋
            </button>
          )}
        </div>
        <div
          className="srb-ai-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(aiOutput[key]) }}
        />
      </div>
    ) : null
  );

  // ── RENDER DASHBOARD ────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="srb-dashboard">
      <div className="srb-hero">
        <span className="srb-hero-tag">▸ STEM RESEARCH BUILDER v1.0</span>
        <h1>
          Xây dựng đề tài<br />
          <span>Khoa học kỹ thuật</span>
        </h1>
        <p>
          Từ ý tưởng đến báo cáo hoàn chỉnh — hệ thống hỗ trợ học sinh THPT
          nghiên cứu khoa học với trợ lý AI tích hợp.
        </p>
      </div>

      <div className="srb-stats">
        <div className="srb-stat-card">
          <div className="srb-stat-num">7</div>
          <div className="srb-stat-label">Modules</div>
        </div>
        <div className="srb-stat-card">
          <div className="srb-stat-num">8</div>
          <div className="srb-stat-label">Lĩnh vực</div>
        </div>
        <div className="srb-stat-card">
          <div className="srb-stat-num">AI</div>
          <div className="srb-stat-label">Tự động</div>
        </div>
        <div className="srb-stat-card">
          <div className="srb-stat-num">∞</div>
          <div className="srb-stat-label">Đề tài</div>
        </div>
      </div>

      <div className="srb-modules">
        {[
          { icon: "💡", num: "MODULE 01", title: "Idea Generator", desc: "AI gợi ý 6–8 đề tài phù hợp theo lĩnh vực và vấn đề thực tế, phân loại theo mức độ khó." },
          { icon: "🔍", num: "MODULE 02", title: "Problem Analyzer", desc: "Xác định mục tiêu nghiên cứu, câu hỏi khoa học và giả thuyết kiểm chứng được." },
          { icon: "⚗️", num: "MODULE 03", title: "Method Suggestion", desc: "Gợi ý phương pháp, công cụ, thuật toán phù hợp với từng đề tài." },
          { icon: "🧪", num: "MODULE 04", title: "Experiment Designer", desc: "Tự động tạo biến số, quy trình thực nghiệm và bảng thu thập dữ liệu." },
          { icon: "📊", num: "MODULE 05", title: "Data Analyzer", desc: "Hướng dẫn phân tích thống kê, vẽ biểu đồ và sinh code Python mẫu." },
          { icon: "📄", num: "MODULE 06", title: "Report Generator", desc: "Sinh báo cáo khoa học theo chuẩn thi KHKT Quốc gia, xuất nhiều định dạng." },
          { icon: "🎯", num: "MODULE 07", title: "Presentation Builder", desc: "Tạo kịch bản slide PowerPoint và poster khoa học chuyên nghiệp." },
        ].map((m, i) => (
          <div key={i} className="srb-module-card" onClick={() => { setView("wizard"); setCurrentStep(i + 1); }}>
            <div className="srb-module-num">{m.num}</div>
            <div className="srb-module-icon">{m.icon}</div>
            <div className="srb-module-title">{m.title}</div>
            <div className="srb-module-desc">{m.desc}</div>
            {completedSteps.has(i + 1) && <div className="srb-module-done">✓</div>}
          </div>
        ))}
      </div>

      <div className="srb-cta">
        <button className="btn-primary btn-lg" onClick={() => { setView("wizard"); setCurrentStep(1); }}>
          ✦ Bắt đầu đề tài mới
        </button>
        {!apiKey && (
          <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={() => setShowSettings(true)}>
            ⚙ Cài đặt API Key
          </button>
        )}
      </div>
    </div>
  );

  // ── RENDER WIZARD ───────────────────────────────────────────────────────────
  const renderWizard = () => {
    const progress = (completedSteps.size / 7) * 100;
    const topic = getCurrentTopic();

    return (
      <div className="srb-wizard">
        {/* Progress */}
        <div className="srb-progress-bar">
          <div className="srb-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step Nav */}
        <div className="srb-stepnav">
          {STEPS.map((s, i) => (
            <div key={s.id} className="srb-step-item">
              {i > 0 && (
                <div className={`srb-step-connector ${completedSteps.has(s.id - 1) ? "done" : ""}`} />
              )}
              <button
                className={`srb-step-btn ${currentStep === s.id ? "active" : ""} ${completedSteps.has(s.id) ? "done" : ""}`}
                onClick={() => setCurrentStep(s.id)}
              >
                <div className="srb-step-circle">
                  {completedSteps.has(s.id) ? "✓" : s.icon}
                </div>
                <span className="srb-step-label">{s.short}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Project Summary if exists */}
        {topic && currentStep > 1 && (
          <div className="srb-summary">
            <div className="srb-summary-title">◈ DỰ ÁN ĐANG THỰC HIỆN</div>
            <div className="srb-summary-row">
              <span className="srb-summary-key">Lĩnh vực</span>
              <span className="srb-summary-val">{project.field}</span>
            </div>
            <div className="srb-summary-row">
              <span className="srb-summary-key">Đề tài</span>
              <span className="srb-summary-val" style={{ color: "var(--accent)", fontWeight: 500 }}>{topic}</span>
            </div>
            <div className="srb-summary-row">
              <span className="srb-summary-key">Tiến độ</span>
              <span className="srb-summary-val">
                <span className="srb-progress-text">{completedSteps.size}/7 modules hoàn tất</span>
              </span>
            </div>
          </div>
        )}

        {/* Step 1: Ideas */}
        {currentStep === 1 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">💡</div>
              <div>
                <div className="srb-step-subtitle">MODULE 01 / IDEA GENERATOR</div>
                <div className="srb-step-title">Sinh ý tưởng đề tài</div>
              </div>
            </div>

            <div className="srb-form-group">
              <label className="srb-label">Lĩnh vực nghiên cứu</label>
              <select
                className="srb-select"
                value={project.field}
                onChange={(e) => setField("field", e.target.value)}
              >
                <option value="">— Chọn lĩnh vực —</option>
                {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="srb-form-group">
              <label className="srb-label">Vấn đề thực tế quan tâm</label>
              <div className="srb-tags">
                {PROBLEMS.map((p) => (
                  <span
                    key={p}
                    className={`srb-tag ${project.problem === p ? "active" : ""}`}
                    onClick={() => setField("problem", project.problem === p ? "" : p)}
                  >
                    {p}
                  </span>
                ))}
              </div>
              <input
                className="srb-input"
                style={{ marginTop: 10 }}
                placeholder="Hoặc nhập vấn đề khác..."
                value={PROBLEMS.includes(project.problem) ? "" : project.problem}
                onChange={(e) => setField("problem", e.target.value)}
              />
            </div>

            <button
              className="btn-ghost"
              onClick={generateIdeas}
              disabled={!project.field || loading.ideas}
            >
              {loading.ideas ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI gợi ý đề tài"}
            </button>

            {renderError("ideas")}

            {aiOutput.ideas && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.ideas ? "pulsing" : ""}`} />
                  GỢI Ý ĐỀ TÀI
                </div>
                <div className="srb-result-grid">
                  {parsedTopics.length > 0 ? parsedTopics.map((line, i) => {
                    const parts = line.split("|");
                    const title = parts[0]?.replace(/^\d+\.\s*/, "").trim();
                    const diff = parts[1]?.trim().toLowerCase();
                    const desc = parts[2]?.trim();
                    const diffClass = diff?.includes("dễ") ? "easy" : diff?.includes("khó") ? "hard" : "medium";
                    return (
                      <div
                        key={i}
                        className={`srb-result-card ${project.selectedTopic === title ? "selected" : ""}`}
                        onClick={() => setField("selectedTopic", title)}
                      >
                        <span className="srb-result-num">0{i + 1}</span>
                        <div>
                          <span className="srb-result-text" style={{ fontWeight: 500 }}>{title}</span>
                          {diff && <span className={`srb-diff ${diffClass}`}>{diff}</span>}
                          {desc && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{desc}</div>}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="srb-ai-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(aiOutput.ideas) }} />
                  )}
                </div>
              </div>
            )}

            <div className="srb-form-group" style={{ marginTop: 16 }}>
              <label className="srb-label">Hoặc nhập đề tài tùy chọn</label>
              <input
                className="srb-input"
                value={project.customTopic}
                onChange={(e) => setField("customTopic", e.target.value)}
                placeholder="Nhập tên đề tài của bạn..."
              />
            </div>

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setView("dashboard")}>← Dashboard</button>
              <button
                className="btn-primary"
                disabled={!topic}
                onClick={() => setCurrentStep(2)}
              >
                Tiếp theo: Phân tích →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analysis */}
        {currentStep === 2 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">🔍</div>
              <div>
                <div className="srb-step-subtitle">MODULE 02 / PROBLEM ANALYZER</div>
                <div className="srb-step-title">Phân tích vấn đề</div>
              </div>
            </div>

            <div className="srb-form-group">
              <label className="srb-label">Đề tài đã chọn</label>
              <input
                className="srb-input"
                value={topic}
                onChange={(e) => {
                  if (project.selectedTopic) setField("selectedTopic", e.target.value);
                  else setField("customTopic", e.target.value);
                }}
                placeholder="Nhập tên đề tài..."
              />
            </div>

            <button
              className="btn-ghost"
              onClick={analyzeProblem}
              disabled={!topic || loading.analysis}
            >
              {loading.analysis ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI phân tích đề tài"}
            </button>

            {renderError("analysis")}
            {renderAIContent("analysis", "PHÂN TÍCH VẤN ĐỀ", loading.analysis)}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(1)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(3)}>
                Tiếp theo: Phương pháp →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Method */}
        {currentStep === 3 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">⚗️</div>
              <div>
                <div className="srb-step-subtitle">MODULE 03 / METHOD SUGGESTION</div>
                <div className="srb-step-title">Gợi ý phương pháp</div>
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={suggestMethod}
              disabled={!topic || loading.method}
            >
              {loading.method ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI đề xuất phương pháp"}
            </button>

            {renderError("method")}
            {renderAIContent("method", "PHƯƠNG PHÁP NGHIÊN CỨU", loading.method)}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(2)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(4)}>
                Tiếp theo: Thí nghiệm →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Experiment */}
        {currentStep === 4 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">🧪</div>
              <div>
                <div className="srb-step-subtitle">MODULE 04 / EXPERIMENT DESIGNER</div>
                <div className="srb-step-title">Thiết kế thí nghiệm</div>
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={designExperiment}
              disabled={!topic || loading.experiment}
            >
              {loading.experiment ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI thiết kế thí nghiệm"}
            </button>

            {renderError("experiment")}
            {renderAIContent("experiment", "THIẾT KẾ THÍ NGHIỆM", loading.experiment)}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(3)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(5)}>
                Tiếp theo: Phân tích dữ liệu →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Data */}
        {currentStep === 5 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">📊</div>
              <div>
                <div className="srb-step-subtitle">MODULE 05 / DATA ANALYZER</div>
                <div className="srb-step-title">Phân tích dữ liệu</div>
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={analyzeData}
              disabled={!topic || loading.data}
            >
              {loading.data ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI hướng dẫn phân tích"}
            </button>

            {renderError("data")}
            {renderAIContent("data", "PHÂN TÍCH & MÃ PYTHON", loading.data)}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(4)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(6)}>
                Tiếp theo: Báo cáo →
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Report */}
        {currentStep === 6 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">📄</div>
              <div>
                <div className="srb-step-subtitle">MODULE 06 / REPORT GENERATOR</div>
                <div className="srb-step-title">Sinh báo cáo khoa học</div>
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={generateReport}
              disabled={!topic || loading.report}
            >
              {loading.report ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI tạo báo cáo"}
            </button>

            {renderError("report")}
            {renderAIContent("report", "BÁO CÁO KHOA HỌC", loading.report)}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(5)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(7)}>
                Tiếp theo: Trình bày →
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Presentation */}
        {currentStep === 7 && (
          <div className="srb-step-panel">
            <div className="srb-step-header">
              <div className="srb-step-icon-lg">🎯</div>
              <div>
                <div className="srb-step-subtitle">MODULE 07 / PRESENTATION BUILDER</div>
                <div className="srb-step-title">Kịch bản trình bày</div>
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={buildPresentation}
              disabled={!topic || loading.presentation}
            >
              {loading.presentation ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI tạo kịch bản slide"}
            </button>

            {renderError("presentation")}
            {renderAIContent("presentation", "KỊCH BẢN SLIDE / POSTER", loading.presentation)}

            {/* Export section - shown when enough steps done */}
            {completedSteps.size >= 3 && (
              <div className="srb-export-box" style={{ marginTop: 24 }}>
                <div className="srb-export-icon">🎉</div>
                <div className="srb-export-title">
                  {completedSteps.size >= 7 ? "Đề tài hoàn thành!" : "Xuất kết quả"}
                </div>
                <div className="srb-export-sub">
                  Dự án "{topic}" — {completedSteps.size}/7 modules hoàn tất
                </div>
                <div className="srb-export-btns">
                  <button className="btn-primary" onClick={exportTXT}>
                    📥 Xuất TXT
                  </button>
                  <button className="btn-ghost" onClick={exportHTML}>
                    🌐 Xuất HTML
                  </button>
                  <button className="btn-ghost" onClick={exportMarkdown}>
                    📝 Xuất Markdown
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setProject(initialProject);
                      setAiOutput({});
                      setCompletedSteps(new Set());
                      setErrors({});
                      setCurrentStep(1);
                      showToast("Đã reset, bắt đầu đề tài mới!");
                    }}
                  >
                    ✦ Đề tài mới
                  </button>
                </div>
              </div>
            )}

            <div className="srb-actions" style={{ marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setCurrentStep(6)}>← Quay lại</button>
              <button className="btn-secondary" onClick={() => setView("dashboard")}>⌂ Dashboard</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="srb-root">
      <header className="srb-header">
        <div className="srb-logo" onClick={() => setView("dashboard")} style={{ cursor: "pointer" }}>
          <div className="srb-logo-icon">SRB</div>
          <div>
            <div className="srb-logo-text">STEM Research Builder</div>
            <div className="srb-logo-sub">THPT · Khoa học kỹ thuật · AI</div>
          </div>
        </div>
        <div className="srb-header-right">
          {getCurrentTopic() && (
            <span className="srb-header-topic">
              ◈ {getCurrentTopic()}
            </span>
          )}
          <span className="srb-badge">
            {completedSteps.size}/7 MODULES
          </span>
          <button
            className="srb-settings-btn"
            onClick={() => setShowSettings(true)}
            title="Cài đặt API"
          >
            ⚙
          </button>
        </div>
      </header>

      {view === "dashboard" ? renderDashboard() : renderWizard()}

      {showSettings && renderSettings()}

      {/* Toast */}
      {toast && (
        <div className={`srb-toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

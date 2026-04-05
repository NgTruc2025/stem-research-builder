import { useState, useCallback } from "react";

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

// ─── API CALL ─────────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

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

// ─── STYLED COMPONENTS (inline) ──────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans:wght@300;400;500;600&display=swap');

  :root {
    --bg: #070b14;
    --surface: #0d1526;
    --surface2: #121d35;
    --border: #1e2e50;
    --accent: #e8a020;
    --accent2: #4ecdc4;
    --accent3: #ff6b6b;
    --text: #d4dff0;
    --text-dim: #7a8fb0;
    --text-bright: #f0f6ff;
    --success: #43d98c;
    --mono: 'IBM Plex Mono', monospace;
    --serif: 'Playfair Display', serif;
    --sans: 'Noto Sans', sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .srb-root {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    background-image:
      radial-gradient(ellipse 80% 50% at 20% -20%, rgba(232,160,32,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(78,205,196,0.04) 0%, transparent 60%);
  }

  /* HEADER */
  .srb-header {
    border-bottom: 1px solid var(--border);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(13,21,38,0.95);
    backdrop-filter: blur(10px);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .srb-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .srb-logo-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--accent), #c87a10);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: var(--bg);
    font-family: var(--mono);
    letter-spacing: -1px;
  }
  .srb-logo-text {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-bright);
    letter-spacing: 0.5px;
  }
  .srb-logo-sub {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .srb-badge {
    background: rgba(232,160,32,0.1);
    border: 1px solid rgba(232,160,32,0.3);
    color: var(--accent);
    font-family: var(--mono);
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 20px;
    letter-spacing: 1px;
  }

  /* DASHBOARD */
  .srb-dashboard {
    max-width: 1100px;
    margin: 0 auto;
    padding: 48px 32px;
  }
  .srb-hero {
    text-align: center;
    margin-bottom: 56px;
  }
  .srb-hero-tag {
    display: inline-block;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent2);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(78,205,196,0.3);
    padding-bottom: 4px;
  }
  .srb-hero h1 {
    font-family: var(--serif);
    font-size: 48px;
    font-weight: 700;
    color: var(--text-bright);
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .srb-hero h1 span {
    color: var(--accent);
  }
  .srb-hero p {
    color: var(--text-dim);
    font-size: 16px;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* MODULE CARDS */
  .srb-modules {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }
  .srb-module-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .srb-module-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .srb-module-card:hover {
    border-color: rgba(232,160,32,0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  .srb-module-card:hover::before { opacity: 1; }
  .srb-module-num {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .srb-module-icon {
    font-size: 28px;
    margin-bottom: 12px;
  }
  .srb-module-title {
    font-family: var(--serif);
    font-size: 17px;
    font-weight: 600;
    color: var(--text-bright);
    margin-bottom: 8px;
  }
  .srb-module-desc {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.6;
  }

  /* CTA BUTTON */
  .srb-cta {
    text-align: center;
    margin-top: 16px;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent), #c87a10);
    color: var(--bg);
    border: none;
    padding: 14px 36px;
    border-radius: 8px;
    font-family: var(--sans);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(232,160,32,0.35);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .btn-secondary {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 10px 24px;
    border-radius: 8px;
    font-family: var(--sans);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .btn-ghost {
    background: rgba(232,160,32,0.08);
    color: var(--accent);
    border: 1px solid rgba(232,160,32,0.25);
    padding: 10px 20px;
    border-radius: 8px;
    font-family: var(--mono);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
  }
  .btn-ghost:hover {
    background: rgba(232,160,32,0.15);
    border-color: rgba(232,160,32,0.5);
  }
  .btn-ghost:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* WIZARD */
  .srb-wizard {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  /* STEP NAV */
  .srb-stepnav {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
    overflow-x: auto;
    padding-bottom: 4px;
    gap: 0;
  }
  .srb-stepnav::-webkit-scrollbar { height: 2px; }
  .srb-stepnav::-webkit-scrollbar-thumb { background: var(--border); }
  .srb-step-item {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .srb-step-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .srb-step-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    transition: all 0.2s;
    background: var(--surface);
  }
  .srb-step-btn.active .srb-step-circle {
    border-color: var(--accent);
    background: rgba(232,160,32,0.12);
    box-shadow: 0 0 12px rgba(232,160,32,0.2);
  }
  .srb-step-btn.done .srb-step-circle {
    border-color: var(--success);
    background: rgba(67,217,140,0.1);
  }
  .srb-step-label {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .srb-step-btn.active .srb-step-label { color: var(--accent); }
  .srb-step-btn.done .srb-step-label { color: var(--success); }
  .srb-step-connector {
    width: 32px;
    height: 1px;
    background: var(--border);
    flex-shrink: 0;
  }
  .srb-step-connector.done {
    background: rgba(67,217,140,0.4);
  }

  /* STEP PANEL */
  .srb-step-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
  }
  .srb-step-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .srb-step-icon-lg {
    width: 52px;
    height: 52px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  .srb-step-title {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-bright);
    margin-bottom: 4px;
  }
  .srb-step-subtitle {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* FORM ELEMENTS */
  .srb-form-group {
    margin-bottom: 20px;
  }
  .srb-label {
    display: block;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent2);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .srb-select, .srb-input, .srb-textarea {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    padding: 12px 16px;
    outline: none;
    transition: border-color 0.2s;
    appearance: none;
  }
  .srb-select:focus, .srb-input:focus, .srb-textarea:focus {
    border-color: rgba(232,160,32,0.5);
  }
  .srb-textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.6;
  }
  .srb-select option { background: var(--surface2); }

  /* TAGS */
  .srb-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .srb-tag {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--sans);
  }
  .srb-tag:hover {
    border-color: rgba(232,160,32,0.4);
    color: var(--text);
  }
  .srb-tag.active {
    background: rgba(232,160,32,0.1);
    border-color: rgba(232,160,32,0.6);
    color: var(--accent);
  }

  /* AI OUTPUT */
  .srb-ai-box {
    background: var(--surface2);
    border: 1px solid rgba(78,205,196,0.2);
    border-radius: 12px;
    padding: 24px;
    margin-top: 20px;
    position: relative;
    overflow: hidden;
  }
  .srb-ai-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent2), transparent);
  }
  .srb-ai-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--accent2);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .srb-ai-dot {
    width: 6px;
    height: 6px;
    background: var(--accent2);
    border-radius: 50%;
  }
  .srb-ai-dot.pulsing {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  .srb-ai-content {
    color: var(--text);
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    font-family: var(--sans);
  }

  /* RESULT CARDS */
  .srb-result-grid {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }
  .srb-result-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .srb-result-card:hover, .srb-result-card.selected {
    border-color: rgba(232,160,32,0.5);
    background: rgba(232,160,32,0.04);
  }
  .srb-result-card.selected {
    box-shadow: 0 0 0 1px rgba(232,160,32,0.3);
  }
  .srb-result-num {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    font-weight: 500;
    padding-top: 2px;
    flex-shrink: 0;
  }
  .srb-result-text {
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
  }

  /* DIFF BADGE */
  .srb-diff {
    display: inline-block;
    font-family: var(--mono);
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    margin-left: 8px;
  }
  .srb-diff.easy { background: rgba(67,217,140,0.1); color: var(--success); border: 1px solid rgba(67,217,140,0.25); }
  .srb-diff.medium { background: rgba(232,160,32,0.1); color: var(--accent); border: 1px solid rgba(232,160,32,0.25); }
  .srb-diff.hard { background: rgba(255,107,107,0.1); color: var(--accent3); border: 1px solid rgba(255,107,107,0.25); }

  /* ACTIONS */
  .srb-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 24px;
  }

  /* PROGRESS */
  .srb-progress-bar {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    margin-bottom: 32px;
    overflow: hidden;
  }
  .srb-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  /* SUMMARY */
  .srb-summary {
    background: var(--surface2);
    border: 1px solid rgba(67,217,140,0.2);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
  }
  .srb-summary-title {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--success);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .srb-summary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .srb-summary-key {
    color: var(--text-dim);
    flex-shrink: 0;
    width: 120px;
    font-family: var(--mono);
    font-size: 11px;
    padding-top: 2px;
  }
  .srb-summary-val {
    color: var(--text);
    line-height: 1.5;
  }

  /* LOADING */
  .srb-loading {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .srb-loading span {
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
    animation: bounce 0.8s ease infinite;
  }
  .srb-loading span:nth-child(2) { animation-delay: 0.15s; }
  .srb-loading span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }

  /* EXPORT BOX */
  .srb-export-box {
    background: linear-gradient(135deg, rgba(232,160,32,0.06), rgba(78,205,196,0.04));
    border: 1px solid rgba(232,160,32,0.2);
    border-radius: 16px;
    padding: 28px;
    text-align: center;
  }
  .srb-export-title {
    font-family: var(--serif);
    font-size: 22px;
    color: var(--text-bright);
    margin-bottom: 8px;
  }
  .srb-export-sub {
    color: var(--text-dim);
    font-size: 13px;
    margin-bottom: 24px;
  }
  .srb-export-btns {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* SCROLL */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* RESPONSIVE */
  @media (max-width: 600px) {
    .srb-hero h1 { font-size: 32px; }
    .srb-dashboard { padding: 24px 16px; }
    .srb-wizard { padding: 20px 12px; }
    .srb-step-panel { padding: 20px; }
  }
`;

// ─── PROJECT STATE ────────────────────────────────────────────────────────────
const initialProject = {
  field: "",
  problem: "",
  selectedTopic: "",
  topics: [],
  objective: "",
  research_question: "",
  hypothesis: "",
  methodology: "",
  variables: "",
  procedure: "",
  dataTable: "",
  dataAnalysis: "",
  report: "",
  presentation: "",
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StemResearchBuilder() {
  const [view, setView] = useState("dashboard"); // dashboard | wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState(initialProject);
  const [aiOutput, setAiOutput] = useState({});
  const [loading, setLoading] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const setField = (key, val) => setProject((p) => ({ ...p, [key]: val }));
  const setOutput = (key, val) => setAiOutput((o) => ({ ...o, [key]: val }));
  const setLoad = (key, val) => setLoading((l) => ({ ...l, [key]: val }));

  const markDone = (step) => setCompletedSteps((s) => new Set([...s, step]));

  // ── STEP 1: GENERATE IDEAS ──────────────────────────────────────────────────
  const generateIdeas = useCallback(async () => {
    if (!project.field) return;
    setLoad("ideas", true);
    setOutput("ideas", "");
    try {
      await callClaude(
        `Bạn là chuyên gia nghiên cứu khoa học kỹ thuật THPT Việt Nam. Hãy trả lời bằng tiếng Việt, ngắn gọn, thực tế.`,
        `Lĩnh vực: ${project.field}
Vấn đề thực tế: ${project.problem || "tổng quát"}

Hãy gợi ý 6 đề tài nghiên cứu khoa học kỹ thuật phù hợp học sinh THPT. 
Mỗi đề tài theo định dạng:
[STT]. [TÊN ĐỀ TÀI] | [DỄ/TRUNG BÌNH/KHÓ] | [một câu mô tả ngắn]

Ưu tiên tính ứng dụng thực tiễn cao, có thể làm được trong điều kiện học sinh THPT.`,
        (t) => setOutput("ideas", t)
      );
      markDone(1);
    } finally {
      setLoad("ideas", false);
    }
  }, [project.field, project.problem]);

  // ── STEP 2: ANALYZE PROBLEM ─────────────────────────────────────────────────
  const analyzeProblem = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("analysis", true);
    setOutput("analysis", "");
    try {
      await callClaude(
        `Bạn là cố vấn khoa học cho học sinh THPT Việt Nam. Trả lời bằng tiếng Việt, súc tích và chuẩn xác theo format được yêu cầu.`,
        `Đề tài: "${project.selectedTopic}"
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
        (t) => setOutput("analysis", t)
      );
      markDone(2);
    } finally {
      setLoad("analysis", false);
    }
  }, [project.selectedTopic, project.field]);

  // ── STEP 3: METHOD ──────────────────────────────────────────────────────────
  const suggestMethod = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("method", true);
    setOutput("method", "");
    try {
      await callClaude(
        `Bạn là chuyên gia phương pháp nghiên cứu khoa học THPT. Trả lời bằng tiếng Việt.`,
        `Đề tài: "${project.selectedTopic}"
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
        (t) => setOutput("method", t)
      );
      markDone(3);
    } finally {
      setLoad("method", false);
    }
  }, [project.selectedTopic, project.field]);

  // ── STEP 4: EXPERIMENT ──────────────────────────────────────────────────────
  const designExperiment = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("experiment", true);
    setOutput("experiment", "");
    try {
      await callClaude(
        `Bạn là giáo viên hướng dẫn thí nghiệm khoa học THPT. Trả lời tiếng Việt, chi tiết, thực tế.`,
        `Đề tài: "${project.selectedTopic}"
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
        (t) => setOutput("experiment", t)
      );
      markDone(4);
    } finally {
      setLoad("experiment", false);
    }
  }, [project.selectedTopic, aiOutput.method]);

  // ── STEP 5: DATA ANALYSIS ───────────────────────────────────────────────────
  const analyzeData = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("data", true);
    setOutput("data", "");
    try {
      await callClaude(
        `Bạn là chuyên gia phân tích dữ liệu và thống kê cho dự án nghiên cứu THPT. Trả lời tiếng Việt.`,
        `Đề tài: "${project.selectedTopic}"
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
        (t) => setOutput("data", t)
      );
      markDone(5);
    } finally {
      setLoad("data", false);
    }
  }, [project.selectedTopic, project.field]);

  // ── STEP 6: REPORT ──────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("report", true);
    setOutput("report", "");
    try {
      await callClaude(
        `Bạn là chuyên gia viết báo cáo khoa học THPT theo chuẩn thi Khoa học kỹ thuật Quốc gia Việt Nam. Trả lời tiếng Việt.`,
        `Đề tài: "${project.selectedTopic}"
Lĩnh vực: ${project.field}
Mục tiêu đã phân tích: ${aiOutput.analysis ? "có" : "chưa có"}

Tạo khung báo cáo nghiên cứu khoa học kỹ thuật đầy đủ:

# BÁO CÁO NGHIÊN CỨU KHOA HỌC
## "${project.selectedTopic}"

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
        (t) => setOutput("report", t)
      );
      markDone(6);
    } finally {
      setLoad("report", false);
    }
  }, [project.selectedTopic, project.field, aiOutput.analysis]);

  // ── STEP 7: PRESENTATION ────────────────────────────────────────────────────
  const buildPresentation = useCallback(async () => {
    if (!project.selectedTopic) return;
    setLoad("presentation", true);
    setOutput("presentation", "");
    try {
      await callClaude(
        `Bạn là chuyên gia thiết kế slide thuyết trình khoa học cho học sinh THPT Việt Nam. Trả lời tiếng Việt.`,
        `Đề tài: "${project.selectedTopic}"
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
        (t) => setOutput("presentation", t)
      );
      markDone(7);
    } finally {
      setLoad("presentation", false);
    }
  }, [project.selectedTopic, project.field]);

  // ── PARSE TOPICS from ideas text ────────────────────────────────────────────
  const parsedTopics = (aiOutput.ideas || "")
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .slice(0, 8);

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

      <div className="srb-modules">
        {[
          { icon: "💡", num: "MODULE 01", title: "Idea Generator", desc: "AI gợi ý 6–8 đề tài phù hợp theo lĩnh vực và vấn đề thực tế, phân loại theo mức độ khó." },
          { icon: "🔍", num: "MODULE 02", title: "Problem Analyzer", desc: "Xác định mục tiêu nghiên cứu, câu hỏi khoa học và giả thuyết kiểm chứng được." },
          { icon: "⚗️", num: "MODULE 03", title: "Method Suggestion", desc: "Gợi ý phương pháp, công cụ, thuật toán phù hợp với từng đề tài." },
          { icon: "🧪", num: "MODULE 04", title: "Experiment Designer", desc: "Tự động tạo biến số, quy trình thực nghiệm và bảng thu thập dữ liệu." },
          { icon: "📊", num: "MODULE 05", title: "Data Analyzer", desc: "Hướng dẫn phân tích thống kê, vẽ biểu đồ và sinh code Python mẫu." },
          { icon: "📄", num: "MODULE 06", title: "Report Generator", desc: "Sinh báo cáo khoa học theo chuẩn thi KHKT Quốc gia, xuất Word/PDF." },
          { icon: "🎯", num: "MODULE 07", title: "Presentation Builder", desc: "Tạo kịch bản slide PowerPoint và poster khoa học chuyên nghiệp." },
        ].map((m, i) => (
          <div key={i} className="srb-module-card" onClick={() => { setView("wizard"); setCurrentStep(i + 1); }}>
            <div className="srb-module-num">{m.num}</div>
            <div className="srb-module-icon">{m.icon}</div>
            <div className="srb-module-title">{m.title}</div>
            <div className="srb-module-desc">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="srb-cta">
        <button className="btn-primary" onClick={() => { setView("wizard"); setCurrentStep(1); }}>
          ✦ Bắt đầu đề tài mới
        </button>
      </div>
    </div>
  );

  // ── RENDER WIZARD ───────────────────────────────────────────────────────────
  const renderWizard = () => {
    const progress = (completedSteps.size / 7) * 100;

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
        {project.selectedTopic && currentStep > 1 && (
          <div className="srb-summary">
            <div className="srb-summary-title">◈ DỰ ÁN ĐANG THỰC HIỆN</div>
            <div className="srb-summary-row">
              <span className="srb-summary-key">Lĩnh vực</span>
              <span className="srb-summary-val">{project.field}</span>
            </div>
            <div className="srb-summary-row">
              <span className="srb-summary-key">Đề tài</span>
              <span className="srb-summary-val" style={{ color: "var(--accent)", fontWeight: 500 }}>{project.selectedTopic}</span>
            </div>
          </div>
        )}

        {/* Step Panels */}
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
                    <div className="srb-ai-content">{aiOutput.ideas}</div>
                  )}
                </div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setView("dashboard")}>← Dashboard</button>
              <button
                className="btn-primary"
                disabled={!project.selectedTopic}
                onClick={() => setCurrentStep(2)}
              >
                Tiếp theo: Phân tích →
              </button>
            </div>
          </div>
        )}

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
                value={project.selectedTopic}
                onChange={(e) => setField("selectedTopic", e.target.value)}
                placeholder="Nhập tên đề tài..."
              />
            </div>

            <button
              className="btn-ghost"
              onClick={analyzeProblem}
              disabled={!project.selectedTopic || loading.analysis}
            >
              {loading.analysis ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI phân tích đề tài"}
            </button>

            {aiOutput.analysis && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.analysis ? "pulsing" : ""}`} />
                  PHÂN TÍCH VẤN ĐỀ
                </div>
                <div className="srb-ai-content">{aiOutput.analysis}</div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(1)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(3)}>
                Tiếp theo: Phương pháp →
              </button>
            </div>
          </div>
        )}

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
              disabled={!project.selectedTopic || loading.method}
            >
              {loading.method ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI đề xuất phương pháp"}
            </button>

            {aiOutput.method && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.method ? "pulsing" : ""}`} />
                  PHƯƠNG PHÁP NGHIÊN CỨU
                </div>
                <div className="srb-ai-content">{aiOutput.method}</div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(2)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(4)}>
                Tiếp theo: Thí nghiệm →
              </button>
            </div>
          </div>
        )}

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
              disabled={!project.selectedTopic || loading.experiment}
            >
              {loading.experiment ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI thiết kế thí nghiệm"}
            </button>

            {aiOutput.experiment && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.experiment ? "pulsing" : ""}`} />
                  THIẾT KẾ THÍ NGHIỆM
                </div>
                <div className="srb-ai-content">{aiOutput.experiment}</div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(3)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(5)}>
                Tiếp theo: Phân tích dữ liệu →
              </button>
            </div>
          </div>
        )}

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
              disabled={!project.selectedTopic || loading.data}
            >
              {loading.data ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI hướng dẫn phân tích"}
            </button>

            {aiOutput.data && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.data ? "pulsing" : ""}`} />
                  PHÂN TÍCH & MÃ PYTHON
                </div>
                <div className="srb-ai-content">{aiOutput.data}</div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(4)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(6)}>
                Tiếp theo: Báo cáo →
              </button>
            </div>
          </div>
        )}

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
              disabled={!project.selectedTopic || loading.report}
            >
              {loading.report ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI tạo báo cáo"}
            </button>

            {aiOutput.report && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.report ? "pulsing" : ""}`} />
                  BÁO CÁO KHOA HỌC
                </div>
                <div className="srb-ai-content">{aiOutput.report}</div>
              </div>
            )}

            <div className="srb-actions">
              <button className="btn-secondary" onClick={() => setCurrentStep(5)}>← Quay lại</button>
              <button className="btn-primary" onClick={() => setCurrentStep(7)}>
                Tiếp theo: Trình bày →
              </button>
            </div>
          </div>
        )}

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
              disabled={!project.selectedTopic || loading.presentation}
            >
              {loading.presentation ? (
                <span className="srb-loading"><span/><span/><span/></span>
              ) : "⚡ AI tạo kịch bản slide"}
            </button>

            {aiOutput.presentation && (
              <div className="srb-ai-box">
                <div className="srb-ai-label">
                  <div className={`srb-ai-dot ${loading.presentation ? "pulsing" : ""}`} />
                  KỊCH BẢN SLIDE / POSTER
                </div>
                <div className="srb-ai-content">{aiOutput.presentation}</div>
              </div>
            )}

            {completedSteps.size >= 5 && (
              <div className="srb-export-box" style={{ marginTop: 24 }}>
                <div className="srb-export-title">🎉 Đề tài hoàn thành!</div>
                <div className="srb-export-sub">
                  Dự án "{project.selectedTopic}" đã sẵn sàng nộp
                </div>
                <div className="srb-export-btns">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      const content = Object.entries(aiOutput)
                        .map(([k, v]) => `\n${"=".repeat(40)}\n${k.toUpperCase()}\n${"=".repeat(40)}\n${v}`)
                        .join("\n");
                      const blob = new Blob([`ĐỀ TÀI: ${project.selectedTopic}\nLĨNH VỰC: ${project.field}\n${content}`], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `STEM_${project.selectedTopic?.slice(0, 30) || "de_tai"}.txt`;
                      a.click();
                    }}
                  >
                    ⬇ Xuất toàn bộ (.txt)
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setProject(initialProject);
                      setAiOutput({});
                      setCompletedSteps(new Set());
                      setCurrentStep(1);
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
    <>
      <style>{css}</style>
      <div className="srb-root">
        <header className="srb-header">
          <div className="srb-logo" onClick={() => setView("dashboard")} style={{ cursor: "pointer" }}>
            <div className="srb-logo-icon">SRB</div>
            <div>
              <div className="srb-logo-text">STEM Research Builder</div>
              <div className="srb-logo-sub">THPT · Khoa học kỹ thuật · AI</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {project.selectedTopic && (
              <span style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ◈ {project.selectedTopic}
              </span>
            )}
            <span className="srb-badge">
              {completedSteps.size}/7 MODULES
            </span>
          </div>
        </header>

        {view === "dashboard" ? renderDashboard() : renderWizard()}
      </div>
    </>
  );
}

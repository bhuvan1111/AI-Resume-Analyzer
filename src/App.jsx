import { useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ANALYZE_RESUME_PROMPT, METRIC_CONFIG, buildPresenceChecklist } from "../constants.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function cleanJson(text) {
  const raw = typeof text === "string" ? text.trim() : "";
  const withoutFence = raw.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI returned an invalid analysis response.");
  return JSON.parse(withoutFence.slice(start, end + 1));
}

function normalizeResult(data, fallbackChecklist) {
  if (data?.error) return data;
  const metrics = data.performanceMetrics || {};
  return {
    overallScore: Math.max(0, Math.min(100, Number(data.overallScore) || 0)),
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    improvements: Array.isArray(data.improvements) ? data.improvements : [],
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    summary: data.summary || "No summary was returned.",
    performanceMetrics: Object.fromEntries(
      METRIC_CONFIG.map(({ key }) => [key, Math.max(1, Math.min(10, Number(metrics[key]) || 1))])
    ),
    actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
    proTips: Array.isArray(data.proTips) ? data.proTips : [],
    atsChecklist: { ...fallbackChecklist, ...(data.atsChecklist || {}) },
  };
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str || "").join(" ") + "\n";
  }
  return text.replace(/\\s+/g, " ").trim();
}

function Score({ value }) {
  const status = value >= 80 ? "Excellent" : value >= 60 ? "Good" : "Needs Improvement";
  return (
    <div className="score-card text-center">
      <p className="text-slate-300 text-sm uppercase tracking-widest">Overall ATS Score</p>
      <div className="text-7xl font-black text-white my-3">{value}<span className="text-3xl text-sky-300">/100</span></div>
      <span className="inline-flex rounded-full bg-slate-900/50 px-4 py-2 text-sm font-semibold">{status}</span>
    </div>
  );
}

function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const checklist = useMemo(() => buildPresenceChecklist(text), [text]);

  const selectFile = async (selected) => {
    setError("");
    setResult(null);
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("The PDF must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
    try {
      const extracted = await extractPdfText(selected);
      if (extracted.length < 80) {
        setError("Could not extract enough text. Please upload a text-based PDF rather than a scanned image PDF.");
        setText("");
        return;
      }
      setText(extracted);
    } catch (err) {
      setError(err.message || "Unable to read the PDF.");
      setText("");
    }
  };

  const analyze = async () => {
    setError("");
    if (!file || !text) {
      setError("Upload a readable PDF resume first.");
      return;
    }
    if (!window.puter?.ai?.chat) {
      setError("Puter.js AI is unavailable. Check your internet connection and reload the page.");
      return;
    }

    setLoading(true);
    try {
      const prompt = ANALYZE_RESUME_PROMPT.replace("{{DOCUMENT_TEXT}}", text.slice(0, 50000));
      const response = await window.puter.ai.chat(prompt, { model: "gpt-5.6-luna" });
      const responseText = typeof response === "string" ? response : response?.message?.content || response?.text || "";
      const parsed = cleanJson(responseText);
      setResult(normalizeResult(parsed, checklist));
      if (parsed.error) setError(parsed.error);
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setText("");
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="bg-main-gradient px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center mb-10">
          <p className="text-sky-300 font-semibold tracking-[0.25em] uppercase text-sm">AI Career Assistant</p>
          <h1 className="text-4xl sm:text-6xl font-black text-white mt-2">AI Resume Analyzer</h1>
          <p className="text-slate-300 max-w-2xl mx-auto mt-4">Upload your resume and get an AI-powered ATS review with practical improvements.</p>
        </header>

        {!result && (
          <section className="upload-area">
            <div
              className={`upload-zone ${dragging ? "bg-sky-500/10 border-sky-400" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files?.[0]); }}
            >
              <div className="text-5xl mb-4">📄</div>
              <h2 className="text-2xl font-bold text-white">Upload your resume</h2>
              <p className="text-slate-400 mt-2">PDF only • maximum 10 MB</p>
              <button className="btn-primary mt-6" onClick={() => inputRef.current?.click()}>Choose PDF</button>
              <input ref={inputRef} className="hidden" type="file" accept="application/pdf,.pdf" onChange={(e) => selectFile(e.target.files?.[0])} />
            </div>

            {file && (
              <div className="info-box-cyan mt-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white break-all">{file.name}</p>
                  <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB • {text.length.toLocaleString()} extracted characters</p>
                </div>
                <button className="btn-primary" disabled={loading || !text} onClick={analyze}>{loading ? "Analyzing..." : "Analyze Resume"}</button>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 flex justify-between gap-4">
            <span>{error}</span>
            {result && <button className="btn-secondary shrink-0" onClick={reset}>Start Over</button>}
          </div>
        )}

        {loading && (
          <div className="section-card mt-8 text-center">
            <div className="loading-spinner mb-5" />
            <h2 className="text-xl font-bold text-white">Analyzing your resume…</h2>
            <p className="text-slate-400 mt-2">Checking ATS compatibility, content, keywords and measurable achievements.</p>
          </div>
        )}

        {result && !result.error && (
          <section className="mt-8 space-y-6">
            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
              <Score value={result.overallScore} />
              <div className="section-card">
                <h2 className="text-xl font-bold text-white mb-3">AI Summary</h2>
                <p className="text-slate-300 leading-7">{result.summary}</p>
              </div>
            </div>

            <div className="section-card">
              <h2 className="text-xl font-bold text-white mb-5">Performance Metrics</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {METRIC_CONFIG.map((metric) => (
                  <div key={metric.key}>
                    <div className="flex justify-between mb-2"><span className="text-slate-300">{metric.icon} {metric.label}</span><strong>{result.performanceMetrics[metric.key]}/10</strong></div>
                    <div className="progress-bar"><div className={`h-full bg-gradient-to-r ${metric.colorClass}`} style={{ width: `${result.performanceMetrics[metric.key] * 10}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="section-card">
                <h2 className="text-xl font-bold text-green-300 mb-4">✓ Strengths</h2>
                <ul className="space-y-3">{result.strengths.map((item, i) => <li className="list-item-green" key={i}>✓ <span>{item}</span></li>)}</ul>
              </div>
              <div className="section-card">
                <h2 className="text-xl font-bold text-orange-300 mb-4">⚡ Improvements</h2>
                <ul className="space-y-3">{result.improvements.map((item, i) => <li className="list-item-orange" key={i}>→ <span>{item}</span></li>)}</ul>
              </div>
            </div>

            <div className="section-card">
              <h2 className="text-xl font-bold text-white mb-4">🔑 Keywords</h2>
              <div className="flex flex-wrap gap-2">{result.keywords.map((item, i) => <span className="keyword-tag" key={i}>{item}</span>)}</div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="section-card"><h2 className="font-bold text-white mb-3">🎯 Action Items</h2><ul className="space-y-2 text-slate-300">{result.actionItems.map((x,i)=><li key={i}>• {x}</li>)}</ul></div>
              <div className="section-card"><h2 className="font-bold text-white mb-3">💡 Pro Tips</h2><ul className="space-y-2 text-slate-300">{result.proTips.map((x,i)=><li key={i}>• {x}</li>)}</ul></div>
              <div className="section-card"><h2 className="font-bold text-white mb-3">🤖 ATS Checklist</h2><ul className="space-y-2 text-slate-300">{Object.entries(result.atsChecklist).map(([k,v])=><li key={k}>{v ? "✅" : "❌"} {k.replace(/([A-Z])/g," $1")}</li>)}</ul></div>
            </div>

            <div className="text-center pb-10">
              <button className="btn-primary" onClick={reset}>Analyze Another Resume</button>
            </div>
          </section>
        )}

        {!result && text && !loading && (
          <div className="mt-5 text-center text-sm text-slate-500">
            Local pre-check: {Object.values(checklist).filter(Boolean).length}/5 ATS signals detected before AI analysis.
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
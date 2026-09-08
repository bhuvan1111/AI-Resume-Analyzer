export const ANALYZE_RESUME_PROMPT = `
You are an expert ATS resume evaluator and career coach.

First determine whether the uploaded document is a resume. A valid resume should contain most of these:
- Professional experience/work history
- Education
- Skills or qualifications
- Contact information

If it is NOT a resume, return ONLY this JSON:
{
  "error": "This document does not appear to be a resume. Please upload a proper resume containing professional experience, education, and skills sections."
}

If it is a resume, return ONLY valid JSON with this exact structure:
{
  "overallScore": 0,
  "strengths": [],
  "improvements": [],
  "keywords": [],
  "summary": "",
  "performanceMetrics": {
    "formatting": 0,
    "contentQuality": 0,
    "keywordUsage": 0,
    "atsCompatibility": 0,
    "quantifiableAchievements": 0
  },
  "actionItems": [],
  "proTips": [],
  "atsChecklist": {
    "standardSections": false,
    "contactInformation": false,
    "keywordsAndSkills": false,
    "quantifiedAchievements": false,
    "actionVerbs": false
  }
}

Rules:
- Score every numeric metric from 1 to 10.
- overallScore is from 0 to 100.
- Be evidence-based and do not invent experience, skills, education, employers, or achievements.
- Evaluate ATS readability, standard headings, keyword coverage, measurable results, action verbs, clarity, consistency, and content quality.
- strengths, improvements, actionItems, and proTips should each contain concise actionable strings.
- keywords should contain useful skills/terms actually present or clearly relevant to the resume.
- atsChecklist values must reflect the document.
- Return JSON only, with no markdown fences and no commentary.

Document text:
{{DOCUMENT_TEXT}}
`;

export const METRIC_CONFIG = [
  { key: "formatting", label: "Formatting", defaultValue: 7, colorClass: "from-emerald-400 to-emerald-500", icon: "🎨" },
  { key: "contentQuality", label: "Content Quality", defaultValue: 6, colorClass: "from-blue-400 to-blue-500", icon: "📝" },
  { key: "atsCompatibility", label: "ATS Compatibility", defaultValue: 6, colorClass: "from-violet-400 to-violet-500", icon: "🤖" },
  { key: "keywordUsage", label: "Keyword Usage", defaultValue: 5, colorClass: "from-purple-400 to-purple-500", icon: "🔍" },
  { key: "quantifiableAchievements", label: "Quantified Results", defaultValue: 4, colorClass: "from-orange-400 to-orange-500", icon: "📊" },
];

export function buildPresenceChecklist(text = "") {
  const value = text.toLowerCase();
  return {
    standardSections: /(experience|work experience|education|skills|projects|summary|objective|certifications)/i.test(value),
    contactInformation: /@|linkedin|github|phone|contact/i.test(value),
    keywordsAndSkills: /(skills|technical skills|technologies|programming|python|java|javascript|react|machine learning|sql|data analysis)/i.test(value),
    quantifiedAchievements: /\\b\\d+(?:\\.\\d+)?\\s*(%|percent|x|k|m|million|billion|hours|days|users|projects|clients|years)\\b/i.test(value),
    actionVerbs: /(developed|built|created|implemented|designed|optimized|analyzed|led|managed|automated|improved|engineered)/i.test(value),
  };
}
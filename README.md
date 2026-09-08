# AI Resume Analyzer

A React + Vite + Tailwind CSS application that extracts text from PDF resumes and uses Puter.js AI to generate an ATS-focused resume review.

## Features

- PDF resume upload with drag and drop
- Browser-side PDF text extraction using `pdfjs-dist`
- Resume validation and ATS pre-check
- AI-generated 0–100 ATS score
- Formatting, content, ATS, keyword and quantified-results metrics
- Strengths and improvement recommendations
- Keywords, action items and pro tips
- ATS checklist
- Responsive dark interface

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Build

```bash
npm run build
```

## AI provider

The app uses the Puter.js CDN loaded in `index.html` and calls `puter.ai.chat()`. Puter documents the browser CDN and AI chat API at https://docs.puter.com/ and https://docs.puter.com/AI/chat/.

No application API key is hard-coded in this project.

## Notes

This version analyzes text-based PDFs. Scanned/image-only PDFs need OCR before their text can be evaluated.

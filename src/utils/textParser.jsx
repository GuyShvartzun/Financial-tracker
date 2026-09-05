import React from 'react';

const QUANTITATIVE_REGEX = /(₪\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*₪|\b\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b)/;
const QUANTITATIVE_SPLIT_REGEX = /(₪\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*₪|\b\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b)/g;

export function parseQuantitative(str) {
  if (typeof str !== 'string') return str;
  const parts = str.split(QUANTITATIVE_SPLIT_REGEX);
  if (parts.length === 1) return str;
  return parts.map((part, i) => {
    if (QUANTITATIVE_REGEX.test(part)) {
      return (
        <span key={i} className="privacy-blur inline-block">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function parseBold(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      const isNum = QUANTITATIVE_REGEX.test(inner);
      return (
        <strong key={i} className={`font-bold text-stone-900 ${isNum ? 'privacy-blur' : ''}`}>
          {inner}
        </strong>
      );
    }
    return parseQuantitative(part);
  });
}

export function FormattedText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-stone-800 text-sm leading-relaxed text-right dir-rtl" dir="rtl">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2"></div>;
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-base text-[#2E7D32] mt-3 mb-1">{parseBold(line.replace('### ', ''))}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-lg text-stone-900 mt-4 mb-1 border-b pb-1 border-[#E8E2D8]">{parseBold(line.replace('## ', ''))}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={idx} className="font-black text-xl text-stone-900 mt-4 mb-2">{parseBold(line.replace('# ', ''))}</h2>;
        }
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const content = line.trim().substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 mr-3 my-1">
              <span className="text-[#2E7D32] font-bold mt-1">•</span>
              <span>{parseBold(content)}</span>
            </div>
          );
        }
        return <p key={idx} className="my-1">{parseBold(line)}</p>;
      })}
    </div>
  );
}

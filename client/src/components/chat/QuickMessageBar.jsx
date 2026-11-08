import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

const QUICK_TEMPLATES = [
  'Hi, is the device fully charged?',
  'I have arrived at the meeting point.',
  'Could you help me attach the memory card or accessories?',
  'I would like to arrange a time to check and return the device.',
  'The device works well. Thank you!',
];

export const QuickMessageBar = ({ onSelectTemplate, disabled = false }) => {
  return (
    <div className="w-full px-4 py-2.5 border-t border-slate-100 bg-white/90 backdrop-blur-xs flex items-center gap-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none shrink-0">
      <div className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap shrink-0 pl-0.5">
        <Sparkles size={13} className="text-teal-500" />
        <span>Suggestions:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
        {QUICK_TEMPLATES.map((template, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectTemplate(template)}
            className="text-xs bg-teal-50/70 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-full px-3.5 py-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
          >
            <MessageSquare size={12} className="text-teal-600 shrink-0" />
            <span>{template}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickMessageBar;

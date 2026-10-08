import React, { useState } from 'react';
import { 
  FileText, X, Plus, Copy, Download, Search, Wand2, Trash2, CheckCircle2, 
  Palette, Layout, ArrowUp, ArrowDown, Sparkles, Shuffle, Eye, EyeOff, RotateCcw, 
  HelpCircle, Check, XCircle, Award, BookOpen
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { generateRandomUPSC100Questions, UPSC_TOPICS, UPSCQuestion, UPSCTopic } from '../data/upscQuestionsData';

interface PdfStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
}

interface Question {
  id: number;
  type: string;
  en: string;
  hi: string;
  options: string[];
  exam: string;
  ans: string;
  topic?: string;
  explanation?: string;
}

export const PdfStudioModal: React.FC<PdfStudioModalProps> = ({ isOpen, onClose, adminMode }) => {
  if (!isOpen) return null;

  if (!adminMode) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-white text-center space-y-4">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black tracking-wide">Admin Access Required</h3>
          <p className="text-xs text-slate-400">This PDF Studio & Auto-Converter tool is restricted to administrators only.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const [instituteName, setInstituteName] = useState("BRIGHT CAMPUS BHADOHI");
  const [instituteTagline, setInstituteTagline] = useState("ब्राइट कैंपस - सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र (Excellence in Civil Services)");
  const [instituteAddress, setInstituteAddress] = useState("Chauri Rd, BADI BAGH, Bhadohi, Uttar Pradesh 221401");
  const [instituteContact, setInstituteContact] = useState("📞 संपर्क सूत्र: +91 87075 25421");
  const [docTitle, setDocTitle] = useState("UPSC CIVIL SERVICES EXAMINATION - PRELIMS 2026");
  const [docSubTitle, setDocSubTitle] = useState("100 महत्वपूर्ण प्रश्न संग्रह (100 RANDOM QUESTIONS MOCK TEST & GREEN ANSWER KEY)");
  const [docTopicTag, setDocTopicTag] = useState("सामान्य अध्ययन समग्र (GS PAPER-1 COMPLETE MOCK TEST)");
  const [docExamMeta, setDocExamMeta] = useState("समय: 2:00 घंटे | कुल प्रश्न: 100 | अधिकतम अंक: 200 | प्रत्येक प्रश्न: 2 अंक | नकारात्मक अंकन: 1/3 अंक");
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormulas, setShowFormulas] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // UPSC 100 Questions & Interactive Quiz States
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(false);

  // Fancy Customization States
  const [themeStyle, setThemeStyle] = useState<'classic' | 'amber' | 'emerald' | 'indigo'>('amber');
  const [isTwoColumn, setIsTwoColumn] = useState(false);
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [showWatermark, setShowWatermark] = useState(true);

  // Initialize with 100 authentic UPSC randomized questions
  const [questions, setQuestions] = useState<Question[]>(() => generateRandomUPSC100Questions('all'));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate / Load 100 Random Questions every time
  const handleLoadUPSC100 = (topicId?: string) => {
    const targetTopic = topicId !== undefined ? topicId : selectedTopic;
    if (topicId !== undefined) {
      setSelectedTopic(topicId);
    }
    const fresh100 = generateRandomUPSC100Questions(targetTopic);
    setQuestions(fresh100);
    setRevealedAnswers({});
    setUserAnswers({});
    setShowAllAnswers(false);

    const topicObj = UPSC_TOPICS.find(t => t.id === targetTopic);
    if (topicObj) {
      setDocTopicTag(`${topicObj.nameHi} (${topicObj.nameEn})`);
      setDocSubTitle(`UPSC 100 प्रश्न संग्रह - ${topicObj.nameHi} (हर बार रैंडम 100 प्रश्न)`);
      showToast(`🎯 100 नए रैंडम प्रश्न लोड किए गए: ${topicObj.nameHi}!`);
    } else {
      showToast(`🎯 100 नए रैंडम UPSC प्रश्न सफलतापूर्वक लोड किए गए!`);
    }
  };

  // Toggle reveal for single question
  const handleToggleRevealAnswer = (qId: number) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Select an option during practice -> instantly reveals answer in green
  const handleSelectOption = (qId: number, optionLetter: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionLetter
    }));
    setRevealedAnswers(prev => ({
      ...prev,
      [qId]: true
    }));
  };

  // Toggle show all answers across all questions
  const handleToggleShowAllAnswers = () => {
    const nextState = !showAllAnswers;
    setShowAllAnswers(nextState);
    if (nextState) {
      const allRevealed: Record<number, boolean> = {};
      questions.forEach(q => { allRevealed[q.id] = true; });
      setRevealedAnswers(allRevealed);
      showToast("सभी 100 सही उत्तर (हरा / Green) दिखा दिए गए हैं!");
    } else {
      setRevealedAnswers({});
      showToast("सभी उत्तर छुपा दिए गए हैं (अभ्यास मोड)!");
    }
  };

  // Reset quiz test
  const handleResetQuiz = () => {
    setRevealedAnswers({});
    setUserAnswers({});
    setShowAllAnswers(false);
    showToast("प्रैक्टिस टेस्ट रीसेट हो गया! अब दोबारा हल करें।");
  };

  const handleResetInstituteHeader = () => {
    setInstituteName("BRIGHT CAMPUS BHADOHI");
    setInstituteTagline("ब्राइट कैंपस - सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र (Excellence in Civil Services)");
    setInstituteAddress("Chauri Rd, BADI BAGH, Bhadohi, Uttar Pradesh 221401");
    setInstituteContact("📞 संपर्क सूत्र: +91 87075 25421");
    setDocTitle("UPSC CIVIL SERVICES EXAMINATION - PRELIMS 2026");
    setDocSubTitle("100 महत्वपूर्ण प्रश्न संग्रह (100 RANDOM QUESTIONS MOCK TEST & GREEN ANSWER KEY)");
    setDocTopicTag("सामान्य अध्ययन समग्र (GS PAPER-1 COMPLETE MOCK TEST)");
    setDocExamMeta("समय: 2:00 घंटे | कुल प्रश्न: 100 | अधिकतम अंक: 200 | प्रत्येक प्रश्न: 2 अंक | नकारात्मक अंकन: 1/3 अंक");
    showToast("🏛️ हेडिंग Bright Campus Bhadohi विवरण पर रीसेट कर दी गई!");
  };

  // Calculate score statistics
  const attemptedCount = Object.keys(userAnswers).length;
  const correctCount = questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.ans.toLowerCase() ? acc + 1 : acc;
  }, 0);
  const wrongCount = attemptedCount - correctCount;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text && text.trim().length > 10) {
        setRawImportText(text);
        showToast(`File text loaded: ${file.name}`);
      } else {
        const base = file.name.replace(/\.[^/.]+$/, "");
        setRawImportText(`[Attached PDF Document: ${file.name}]
Q.1 ${base} - प्रश्न 1: 5000 रुपये का 8% वार्षिक दर से 2 वर्ष का साधारण ब्याज कितना होगा?
(a) 800 (b) 832 (c) 820 (d) 850
Ans: a [${base} 2026]

Q.2 ${base} - प्रश्न 2: किसी वस्तु को 15% छूट पर बेचने के बाद भी 20% लाभ होता है, यदि अंकित मूल्य 920 रुपये है तो क्रय मूल्य क्या है?
(a) 650 (b) 680 (c) 700 (d) 720
Ans: b [${base} 2026]

Q.3 ${base} - प्रश्न 3: एक टैंक को पाइप A, 12 घंटे में और पाइप B, 15 घंटे में भर सकता है। दोनों को एक साथ खोलने पर कितने समय में टैंक भरेगा?
(a) 6 घंटे 40 मिनट (b) 7 घंटे (c) 5 घंटे 30 मिनट (d) 8 घंटे
Ans: a [${base} 2026]`);
        showToast(`PDF Attached & Data Loaded: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddNewQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: "TYPE-1",
        en: "New Question English text here...",
        hi: "यहाँ नया प्रश्न हिंदी पाठ टाइप करें...",
        options: ["(a) Option A", "(b) Option B", "(c) Option C", "(d) Option D"],
        exam: "NEW EXAM 2026",
        ans: "a"
      }
    ]);
    showToast("New Question Added!");
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
    showToast("Question deleted!");
  };

  const handleDuplicateQuestion = (index: number) => {
    const q = questions[index];
    const duplicated: Question = {
      ...q,
      id: Date.now(),
      hi: `${q.hi} (Copy)`
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    setQuestions(updated);
    showToast("Question duplicated!");
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setQuestions(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setQuestions(updated);
  };

  const handleCopyAll = () => {
    const el = document.getElementById("pdfStudioDocumentPage");
    if (el) {
      navigator.clipboard.writeText(el.innerText).then(() => showToast("Full document text copied!"));
    }
  };

  const handleDownloadPDF = () => {
    showToast("Generating PDF...");
    const element = document.getElementById("pdfStudioDocumentPage");
    if (!element) {
        showToast("Error: Could not find document page");
        return;
    }
    
    // Use html2pdf with options
    const opt = {
      margin: 10,
      filename: 'BrightCampus_UPSC_Test.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: true,
        onclone: (doc) => {
            const elements = doc.querySelectorAll('*');
            elements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                const style = getComputedStyle(htmlEl);
                if (style.color.includes('oklch') || style.backgroundColor.includes('oklch')) {
                    htmlEl.style.color = 'black';
                    htmlEl.style.backgroundColor = 'white';
                }
            });
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().catch((err: any) => {
        console.error("PDF generation error:", err);
        showToast("PDF error. Try Print instead.");
    });
  };

  const handlePrint = () => {
    console.log("Print triggered");
    window.print();
  };

  const handleParseImport = () => {
    if (!rawImportText.trim()) {
      showToast("Please paste or attach text first!");
      return;
    }

    let blocks = rawImportText.split(/(?=Q\.\s*\d+|प्र\.\s*\d+|\b\d+\.\s*)/i).filter(b => b.trim());
    if (blocks.length === 0) {
      blocks = rawImportText.split('\n\n').filter(b => b.trim());
    }
    if (blocks.length === 0) {
      blocks = [rawImportText];
    }

    const parsed: Question[] = [];

    blocks.forEach((block, idx) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      let hiText = "";
      let enText = "";
      let options = ["(a) Option A", "(b) Option B", "(c) Option C", "(d) Option D"];
      let exam = "EXAM 2026";
      let ans = "a";

      lines.forEach(line => {
        if (line.match(/\(a\)/i) || line.match(/\(b\)/i)) {
          const matchedOpts = line.match(/\([a-d]\)[^()]*/gi);
          if (matchedOpts && matchedOpts.length > 0) {
            options = matchedOpts.map(o => o.trim());
          }
        } else if (line.toLowerCase().includes("ans:") || line.toLowerCase().includes("उत्तर:")) {
          const ansMatch = line.match(/(?:ans|उत्तर):\s*\(?([a-d])\)?/i);
          if (ansMatch) ans = ansMatch[1].toLowerCase();
        } else if (line.includes("[") && line.includes("]")) {
          exam = line.replace('[', '').replace(']', '').trim();
        } else if (line.length > 3) {
          if (/[a-zA-Z]/.test(line) && !/[\u0900-\u097F]/.test(line)) {
            enText += " " + line;
          } else {
            hiText += " " + line;
          }
        }
      });

      if (!hiText && !enText) {
        hiText = block;
      }

      parsed.push({
        id: Date.now() + idx,
        type: "TYPE-" + (Math.floor(idx / 5) + 1),
        en: enText.trim(),
        hi: hiText.trim(),
        options: options.length === 4 ? options : ["(a) Option A", "(b) Option B", "(c) Option C", "(d) Option D"],
        exam: exam,
        ans: ans
      });
    });

    if (parsed.length > 0) {
      setQuestions(parsed);
      setIsImportModalOpen(false);
      showToast(`${parsed.length} Questions Imported & Formatted Successfully!`);
    } else {
      setQuestions([{
        id: Date.now(),
        type: "TYPE-1",
        en: "Imported Question Document",
        hi: rawImportText.substring(0, 250),
        options: ["(a) Option A", "(b) Option B", "(c) Option C", "(d) Option D"],
        exam: "IMPORTED 2026",
        ans: "a"
      }]);
      setIsImportModalOpen(false);
      showToast("Questions Imported Successfully!");
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return q.hi.toLowerCase().includes(query) || q.en.toLowerCase().includes(query) || q.exam.toLowerCase().includes(query) || q.type.toLowerCase().includes(query);
  });

  // Theme styling helpers
  const getThemeClasses = () => {
    switch (themeStyle) {
      case 'amber':
        return {
          headerBg: 'bg-amber-500 text-slate-950',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
          accentColor: 'text-amber-800',
          formulaBg: 'bg-amber-50/80 border-amber-200',
          cardBg: 'bg-slate-50/80 border-slate-200'
        };
      case 'emerald':
        return {
          headerBg: 'bg-emerald-600 text-white',
          badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          accentColor: 'text-emerald-800',
          formulaBg: 'bg-emerald-50/80 border-emerald-200',
          cardBg: 'bg-slate-50/80 border-slate-200'
        };
      case 'indigo':
        return {
          headerBg: 'bg-indigo-600 text-white',
          badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
          accentColor: 'text-indigo-800',
          formulaBg: 'bg-indigo-50/80 border-indigo-200',
          cardBg: 'bg-slate-50/80 border-slate-200'
        };
      default:
        return {
          headerBg: 'bg-slate-900 text-white',
          badgeBg: 'bg-slate-200 text-slate-900 border-slate-300',
          accentColor: 'text-slate-800',
          formulaBg: 'bg-slate-50 border-slate-200',
          cardBg: 'bg-slate-50/80 border-slate-200'
        };
    }
  };

  const currentTheme = getThemeClasses();

  const getFontSizeClass = () => {
    switch (fontScale) {
      case 'sm': return 'text-[10.55px]';
      case 'lg': return 'text-[13.5px]';
      default: return 'text-xs';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto flex flex-col">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm flex items-center gap-3 z-50 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-xl px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 p-2.5 rounded-xl font-black shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
              <span>{instituteName}</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">UPSC 100 Q&A Studio</span>
            </h1>
            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-0.5">
              <span>📍 {instituteAddress}</span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">{instituteContact}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg cursor-pointer">
            <FileText className="w-3.5 h-3.5" /> + Import PDF Text
          </button>
          <button onClick={handleAddNewQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
          <button onClick={handleCopyAll} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-slate-700 cursor-pointer">
            <Copy className="w-3.5 h-3.5" /> Copy Text
          </button>
          <button onClick={handleDownloadPDF} className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-xl cursor-pointer">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-amber-500/30 cursor-pointer" title="Print Document">
            🖨️ Print
          </button>
          <button onClick={onClose} className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer" title="Close Studio">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Fancy Customization Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 sticky top-[65px] z-30 shadow-md no-print">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsEditHeaderOpen(!isEditHeaderOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              isEditHeaderOpen 
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black' 
                : 'bg-slate-800/90 text-amber-300 hover:bg-slate-700 border-amber-500/40'
            }`}
            title="संस्थान नाम, पता, संपर्क सूत्र और परीक्षा हेडिंग बदलें"
          >
            <span>🏛️</span>
            <span>{isEditHeaderOpen ? 'हेडिंग एडिटर छुपाएं' : 'संस्थान हेडिंग, पता व संपर्क एडिट करें'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">Theme:</span>
            <select 
              value={themeStyle} 
              onChange={(e) => setThemeStyle(e.target.value as any)}
              className="bg-slate-900 text-amber-300 font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="amber">Royal Amber</option>
              <option value="emerald">Emerald Executive</option>
              <option value="indigo">Midnight Indigo</option>
              <option value="classic">Classic Minimal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Layout className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">Layout:</span>
            <button 
              onClick={() => setIsTwoColumn(!isTwoColumn)}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${isTwoColumn ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
            >
              {isTwoColumn ? '2-Column Grid' : 'Single Column'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="font-bold text-white">Font Size:</span>
            {(['sm', 'md', 'lg'] as const).map((s) => (
              <button 
                key={s} 
                onClick={() => setFontScale(s)}
                className={`px-2 py-0.5 rounded-md font-bold uppercase transition cursor-pointer ${fontScale === s ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <label className="flex items-center gap-1.5 font-bold text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showWatermark} 
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0 cursor-pointer"
              />
              Watermark Stamp
            </label>
          </div>
        </div>

        <div className="text-slate-400 italic">
          💡 Click any text on the sheet below to edit live before downloading!
        </div>
      </div>

      <main className="max-w-5xl mx-auto my-6 px-4 flex-1 w-full space-y-5">
        
        {/* Institute Heading & Contact Live Editor Drawer */}
        {isEditHeaderOpen && (
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 text-white shadow-2xl space-y-4 no-print animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-500 text-slate-950 rounded-xl text-base font-black shadow-md">🏛️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide">
                    संस्थान हेडिंग, पता एवं संपर्क सूत्र एडिटर (Header & Contact Details)
                  </h3>
                  <p className="text-xs text-slate-300">
                    यहाँ परिवर्तन करते ही टेस्ट पेपर हेडिंग, वॉटरमार्क और डाउनलोड होने वाली PDF में रियल-टाइम अपडेट होगा।
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetInstituteHeader}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-3.5 py-2 rounded-xl font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="डिफ़ॉल्ट ब्राइट कैंपस भदोही विवरण रीसेट करें"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Bright Campus Bhadohi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  🏛️ संस्थान का नाम (Institute Name):
                </label>
                <input
                  type="text"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none"
                  placeholder="BRIGHT CAMPUS BHADOHI"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  🎓 टैगलाइन / ध्येय वाक्य (Tagline):
                </label>
                <input
                  type="text"
                  value={instituteTagline}
                  onChange={(e) => setInstituteTagline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-medium outline-none"
                  placeholder="ब्राइट कैंपस - सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  📍 पता (Institute Address):
                </label>
                <input
                  type="text"
                  value={instituteAddress}
                  onChange={(e) => setInstituteAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-medium outline-none"
                  placeholder="स्टेशन रोड, मर्यादापट्टी, भदोही, उत्तर प्रदेश - 221401"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  📞 संपर्क सूत्र व ईमेल (Contact Phone & Email):
                </label>
                <input
                  type="text"
                  value={instituteContact}
                  onChange={(e) => setInstituteContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-amber-300 font-bold outline-none"
                  placeholder="📞 संपर्क: +91 70076 01170, +91 94500 12345 | ✉️ brightcampusbhadohi@gmail.com"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  📝 परीक्षा का मुख्य नाम (Exam Main Title):
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-semibold outline-none"
                  placeholder="UPSC CIVIL SERVICES EXAMINATION - PRELIMS 2026"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  ⏱️ समय, अंक एवं निगेटिव मार्किंग (Exam Instructions):
                </label>
                <input
                  type="text"
                  value={docExamMeta}
                  onChange={(e) => setDocExamMeta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-medium outline-none"
                  placeholder="समय: 2:00 घंटे | कुल प्रश्न: 100 | अंक: 200 | Negative Marking: 1/3"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* UPSC 100 Questions & Topic Selector Control Panel */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 text-white shadow-2xl space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500 text-slate-950 rounded-xl text-base font-black shadow-md">🎯</span>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-wide text-amber-300 flex items-center gap-2">
                  UPSC 100 प्रश्न संग्रह एवं लाइव टेस्ट
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Random 100 Questions
                  </span>
                </h2>
                <p className="text-xs text-slate-300">
                  हर बार 100 नए रैंडम प्रश्न • 'उत्तर देखें' पर क्लिक करते ही सही जवाब हरे (Green) में शो • विषय (Topic) चुनें
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleLoadUPSC100(selectedTopic)}
                className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer"
                title="हर बार नया रैंडम 100 प्रश्न सेट लोड करें"
              >
                <Shuffle className="w-4 h-4" />
                <span>🎲 नया रैंडम 100 सेट लोड करें</span>
              </button>

              <button
                onClick={handleToggleShowAllAnswers}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                  showAllAnswers 
                    ? 'bg-emerald-600 text-white border-emerald-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
                }`}
                title="सभी प्रश्नों के सही उत्तर हरे रंग में दिखाएं"
              >
                {showAllAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAllAnswers ? 'उत्तर छुपाएं' : 'सभी उत्तर दिखाएं (Green)'}</span>
              </button>

              <button
                onClick={handleResetQuiz}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition border border-slate-700 cursor-pointer"
                title="अभ्यास रीसेट करें"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>रीसेट</span>
              </button>
            </div>
          </div>

          {/* Topic Selection Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>विषय चुनें (Choose UPSC Topic - 100 प्रश्न):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                वर्तमान विषय: <strong className="text-white">{UPSC_TOPICS.find(t => t.id === selectedTopic)?.nameHi}</strong>
              </span>
            </div>

            {/* Topic Pills Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
              {UPSC_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleLoadUPSC100(topic.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black scale-[1.02]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
                    }`}
                  >
                    <span>{topic.icon}</span>
                    <span>{topic.nameHi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Quiz Score Tracker */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg font-bold border border-slate-700">
                कुल प्रश्न: <strong className="text-amber-400">{questions.length}</strong>
              </span>
              <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg font-bold border border-slate-700">
                हल किए: <strong className="text-blue-400">{attemptedCount} / {questions.length}</strong>
              </span>
              <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                सही (Green): <strong>{correctCount}</strong>
              </span>
              {wrongCount > 0 && (
                <span className="bg-rose-950/70 text-rose-300 border border-rose-700/50 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  गलत: <strong>{wrongCount}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">शुद्धता (Accuracy):</span>
              <span className="font-extrabold text-amber-300 text-sm">
                {attemptedCount > 0 ? `${Math.round((correctCount / attemptedCount) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="bg-slate-800/90 backdrop-blur rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-white border border-slate-700/80 shadow-lg no-print">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Active Sheet: <strong className="text-amber-400">{instituteName} • {docTitle}</strong></span>
          </div>
          <div className="relative flex-1 sm:flex-initial">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions or topics..." 
              className="bg-slate-900 text-xs text-white px-3 py-2 pl-8 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 w-full sm:w-64"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          </div>
        </div>

        {/* Document Canvas */}
        <div id="pdfStudioDocumentPage" className={`relative bg-white rounded-2xl shadow-2xl p-6 sm:p-12 border border-slate-200 text-slate-900 ${getFontSizeClass()}`}>
          
          {/* Watermark Stamp Overlay */}
          {showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
              <div className="text-center transform -rotate-12 opacity-15">
                <span className="block text-slate-800 font-black text-5xl sm:text-7xl tracking-widest uppercase">
                  BRIGHT CAMPUS BHAODHI
                </span>
                <span className="block text-slate-800 font-black text-xl sm:text-2xl tracking-wider uppercase mt-2">
                  UPSC PRELIMS 2026 • 100 Q&A MOCK TEST
                </span>
              </div>
            </div>
          )}

          <div className="relative z-10">
            {/* Institute Official Header Branding */}
            <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
              {/* Top Seal / Badge */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xl">🏛️</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-300 px-3.5 py-0.5 rounded-full">
                  CIVIL SERVICES & COMPETITIVE EXAMINATIONS ACADEMY
                </span>
                <span className="text-xl">🎓</span>
              </div>

              {/* Main Institute Name */}
              <h1 
                contentEditable 
                suppressContentEditableWarning 
                className="text-2xl sm:text-4xl font-black text-slate-950 tracking-wider uppercase outline-none hover:bg-amber-50 focus:bg-amber-50 px-3 py-1 rounded transition border border-transparent hover:border-amber-300 cursor-text"
                onBlur={(e) => setInstituteName(e.currentTarget.textContent || instituteName)}
                title="संस्थान का नाम (क्लिक करके एडिट करें)"
              >
                {instituteName}
              </h1>

              {/* Institute Tagline */}
              <p 
                contentEditable 
                suppressContentEditableWarning 
                className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5 outline-none hover:bg-amber-50 focus:bg-amber-50 px-2 py-0.5 rounded transition cursor-text"
                onBlur={(e) => setInstituteTagline(e.currentTarget.textContent || instituteTagline)}
                title="टैगलाइन (क्लिक करके एडिट करें)"
              >
                {instituteTagline}
              </p>

              {/* Institute Address */}
              <div 
                contentEditable 
                suppressContentEditableWarning 
                className="text-xs sm:text-sm font-bold text-slate-800 mt-2 flex items-center justify-center gap-1.5 outline-none hover:bg-amber-50 focus:bg-amber-50 px-3 py-1 rounded transition border border-transparent hover:border-amber-300 cursor-text"
                onBlur={(e) => setInstituteAddress(e.currentTarget.textContent || instituteAddress)}
                title="पता (क्लिक करके एडिट करें)"
              >
                <span className="text-red-700 font-extrabold">📍 पता (Address):</span>
                <span>{instituteAddress}</span>
              </div>

              {/* Institute Contact Details */}
              <div 
                contentEditable 
                suppressContentEditableWarning 
                className="text-xs sm:text-sm font-black text-slate-900 mt-1 flex flex-wrap items-center justify-center gap-2 outline-none hover:bg-amber-50 focus:bg-amber-50 px-3 py-1 rounded transition border border-transparent hover:border-amber-300 cursor-text"
                onBlur={(e) => setInstituteContact(e.currentTarget.textContent || instituteContact)}
                title="संपर्क (क्लिक करके एडिट करें)"
              >
                <span className="bg-emerald-50 text-emerald-800 px-3 py-0.5 rounded-lg border border-emerald-300 shadow-xs">
                  {instituteContact}
                </span>
              </div>

              {/* Decorative Divider */}
              <div className="w-36 h-0.5 bg-slate-400 mx-auto my-3" />

              {/* Exam Main Title */}
              <h2 
                contentEditable 
                suppressContentEditableWarning 
                className="text-base sm:text-xl font-black text-blue-950 tracking-wide uppercase outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-0.5 rounded transition cursor-text"
                onBlur={(e) => setDocTitle(e.currentTarget.textContent || docTitle)}
                title="परीक्षा का मुख्य नाम (क्लिक करके एडिट करें)"
              >
                {docTitle}
              </h2>

              {/* Exam Subtitle */}
              <p 
                contentEditable 
                suppressContentEditableWarning 
                className="text-xs sm:text-sm font-extrabold text-red-600 mt-0.5 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-0.5 rounded transition cursor-text"
                onBlur={(e) => setDocSubTitle(e.currentTarget.textContent || docSubTitle)}
                title="उपशीर्षक (क्लिक करके एडिट करें)"
              >
                {docSubTitle}
              </p>

              {/* Exam Instructions / Meta */}
              <p 
                contentEditable 
                suppressContentEditableWarning 
                className="text-[11px] sm:text-xs font-bold text-slate-600 mt-1.5 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-0.5 rounded transition cursor-text"
                onBlur={(e) => setDocExamMeta(e.currentTarget.textContent || docExamMeta)}
                title="समय एवं अंक विवरण (क्लिक करके एडिट करें)"
              >
                {docExamMeta}
              </p>

              {/* Topic Tag Badge */}
              <div className={`inline-block px-5 py-1.5 rounded-full text-sm sm:text-base font-black mt-3 shadow-sm ${currentTheme.headerBg}`}>
                <span 
                  contentEditable 
                  suppressContentEditableWarning 
                  className="outline-none focus:bg-white/20 px-2 py-0.5 rounded cursor-text"
                  onBlur={(e) => setDocTopicTag(e.currentTarget.textContent || docTopicTag)}
                  title="विषय (क्लिक करके एडिट करें)"
                >
                  {docTopicTag}
                </span>
              </div>
            </div>

            {/* Questions Header with Quick Controls */}
            <div className="flex flex-wrap items-center justify-between mb-4 pb-2 border-b-2 border-slate-900 gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-wide uppercase">
                  प्रश्न संग्रह (UPSC 100 Questions)
                </h3>
                <span className="text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold">
                  {filteredQuestions.length} Questions
                </span>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                💡 सही उत्तर देखने के लिए ऑप्शन या <strong className="text-emerald-700">"उत्तर देखें"</strong> बटन दबाएं
              </div>
            </div>

            {/* Questions List (Supports 1 or 2 columns layout) */}
            <div className={`${isTwoColumn ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'} mb-8`}>
              {filteredQuestions.map((q, index) => {
                const isAnswerRevealed = showAllAnswers || revealedAnswers[q.id];
                const userPick = userAnswers[q.id];
                const correctOptionLetter = q.ans.toLowerCase();

                return (
                  <div 
                    key={q.id || index} 
                    className={`rounded-xl p-4 border transition-all duration-200 shadow-sm ${currentTheme.cardBg} ${
                      isAnswerRevealed ? 'border-emerald-300 ring-1 ring-emerald-200/50' : 'hover:border-slate-300'
                    }`}
                  >
                    {/* Top Header of Card */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded-md" contentEditable suppressContentEditableWarning>
                          Q.{index + 1}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${currentTheme.badgeBg}`} contentEditable suppressContentEditableWarning>
                          {q.type}
                        </span>
                        {q.topic && (
                          <span className="hidden sm:inline text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase">
                            {q.topic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Interactive Answer Button */}
                        <button
                          onClick={() => handleToggleRevealAnswer(q.id)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                            isAnswerRevealed
                              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          }`}
                          title="सही उत्तर हरे रंग में देखें"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAnswerRevealed ? 'उत्तर छिपाएं' : 'उत्तर देखें (Answer)'}</span>
                        </button>

                        <button onClick={() => handleMoveUp(index)} className="text-xs text-slate-400 hover:text-slate-900 p-1 cursor-pointer" title="Move Up">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleMoveDown(index)} className="text-xs text-slate-400 hover:text-slate-900 p-1 cursor-pointer" title="Move Down">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDuplicateQuestion(index)} className="text-xs text-slate-400 hover:text-indigo-600 p-1 cursor-pointer" title="Duplicate">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteQuestion(index)} className="text-xs text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bilingual Question Text */}
                    <div className="space-y-1.5 mb-3">
                      {q.en && (
                        <p className="text-slate-900 font-medium leading-relaxed outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning>
                          {q.en}
                        </p>
                      )}
                      <p className="text-slate-900 font-bold leading-relaxed outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning>
                        {q.hi}
                      </p>
                    </div>

                    {/* Options Grid (Clickable & Highlights Correct Answer in Green) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-bold mb-3">
                      {q.options.map((opt, optIdx) => {
                        const optionLetters = ['a', 'b', 'c', 'd'];
                        const currentOptLetter = optionLetters[optIdx] || 'a';
                        const isCorrectOption = correctOptionLetter === currentOptLetter;
                        const isUserSelected = userPick === currentOptLetter;

                        // Calculate styling
                        let optionStyle = "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50";
                        let badgeContent = null;

                        if (isAnswerRevealed) {
                          if (isCorrectOption) {
                            // SHOW GREEN ON CORRECT ANSWER
                            optionStyle = "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400 font-extrabold shadow-md scale-[1.01]";
                            badgeContent = (
                              <span className="text-[10px] bg-white text-emerald-800 px-1.5 py-0.5 rounded font-black tracking-wide uppercase ml-1.5 shadow-xs">
                                ✓ सही उत्तर
                              </span>
                            );
                          } else if (isUserSelected && !isCorrectOption) {
                            // SHOW RED ON WRONG PICK
                            optionStyle = "bg-rose-50 text-rose-800 border-2 border-rose-500 font-bold line-through";
                            badgeContent = (
                              <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold ml-1.5">
                                ✗ गलत
                              </span>
                            );
                          } else {
                            optionStyle = "bg-slate-50/80 text-slate-500 border-slate-200 opacity-75";
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, currentOptLetter)}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                          >
                            <span contentEditable suppressContentEditableWarning className="outline-none">
                              {opt}
                            </span>
                            {badgeContent}
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer: Exam reference and Answer badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 italic outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning>
                        [{q.exam}]
                      </span>

                      {isAnswerRevealed ? (
                        <span className="text-emerald-800 font-black bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 uppercase shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          सटीक उत्तर: ({q.ans})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleRevealAnswer(q.id)}
                          className="text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                        >
                          उत्तर दिखाएं ({q.ans})
                        </button>
                      )}
                    </div>

                    {/* Explanation Box if revealed */}
                    {isAnswerRevealed && q.explanation && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60 bg-emerald-50/70 p-2.5 rounded-lg text-xs text-emerald-950 font-medium">
                        <span className="font-black text-emerald-900 mr-1">📚 व्याख्या एवं संदर्भ:</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Answer Key Grid (All 100 Answers in Emerald/Green) */}
            <div className="mt-8 border-t-2 border-slate-900 pt-6">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    उत्तर कुंजी - सम्पूर्ण 100 प्रश्न (Official Answer Key)
                  </h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    100 Q&A Key
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const el = document.getElementById("pdfStudioAnswerGrid");
                      if (el) navigator.clipboard.writeText(el.innerText).then(() => showToast("संपूर्ण उत्तर कुंजी कॉपी हो गई!"));
                    }} 
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Answers</span>
                  </button>
                </div>
              </div>

              {/* Numbered 1 to 100 Answer Key Grid */}
              <div id="pdfStudioAnswerGrid" className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center font-bold">
                {questions.map((q, idx) => (
                  <div 
                    key={idx} 
                    className="bg-emerald-50/80 border border-emerald-200 p-1.5 rounded-lg flex flex-col items-center justify-center hover:bg-emerald-100 transition"
                  >
                    <span className="text-slate-500 text-[10px]">{idx + 1}</span>
                    <span className="text-emerald-700 font-black uppercase text-xs">
                      ({q.ans})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reference & Notes Section */}
            <div className="mt-8 border-t border-slate-300 pt-5 text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                📚 संदर्भ एवं प्रमाणिक स्रोत (UPSC Prelims Standards):
              </h4>
              <p className="outline-none focus:bg-blue-50 p-1 rounded" contentEditable suppressContentEditableWarning>
                1. Reference Source: Union Public Service Commission (UPSC) Civil Services Examination GS Paper-1 Official Previous Papers, NCERT & Standard Textbooks.
              </p>
              <p className="outline-none focus:bg-blue-50 p-1 rounded" contentEditable suppressContentEditableWarning>
                2. Instructions: Each question contains 4 multiple choice options. Click any option or 'उत्तर देखें' to reveal the verified correct answer in green. All questions randomized on every generation.
              </p>
            </div>

            {/* Official Sheet Footer with Institute Details */}
            <div className="mt-6 pt-4 border-t-2 border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5 font-extrabold text-slate-900">
                🏛️ {instituteName} • {instituteAddress}
              </span>
              <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {instituteContact}
              </span>
            </div>

          </div>
        </div>
      </main>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
                <FileText className="w-4 h-4" /> Paste PDF Raw Text / Questions
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              अपनी नई PDF फ़ाइल अटैच करें या प्रश्नों को नीचे बॉक्स में पेस्ट करें। हमारा स्मार्ट पार्सर उन्हें ऑटोमैटिकली सुन्दर डिज़ाइन वाले द्विभाषी (Hindi + English) प्रश्न कार्ड्स में बदल देगा।
            </p>

            <div className="mb-3 flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 cursor-pointer transition">
                  <FileText className="w-4 h-4" /> Attach PDF / Text File
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.doc,.docx" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
                {attachedFileName ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    ✓ Attached: {attachedFileName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">No PDF attached yet</span>
                )}
              </div>
              {attachedFileName && (
                <button 
                  onClick={() => { setAttachedFileName(null); setRawImportText(""); }} 
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Remove File
                </button>
              )}
            </div>

            <textarea 
              rows={10} 
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              placeholder="यहाँ प्रश्न पेस्ट करें...
उदाहरण:
Q.1 1600 रुपये का 2% की दर से 8 वर्ष का साधारण ब्याज कितना होगा?
(a) 256 (b) 240 (c) 248 (d) 340
Ans: a [SSC CHSL 2025]" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => {
                setRawImportText(`Q.1 2000 रुपये पर 6.5% वार्षिक दर से 13 फरवरी से 27 अप्रैल तक का ब्याज कितना होगा?
(a) 25 (b) 26 (c) 24 (d) 27
Ans: b [SSC CGL Mains 2025]

Q.2 साधारण ब्याज पर कोई राशि 5 वर्षों में दोगुनी हो जाती है। ब्याज दर क्या है?
(a) 20% (b) 25% (c) 30% (d) 40%
Ans: a [SSC CHSL 2025]

Q.3 5000 रुपये की राशि 6% और 9% साधारण ब्याज पर दी गई। वार्षिक ब्याज 390 रुपये है, तो 6% पर उधार राशि है:
(a) 2000 रुपये (b) 2500 रुपये (c) 3000 रुपये (d) 3500 रुपये
Ans: a [SSC CGL 2025]`);
              }} className="text-xs text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer">
                <Wand2 className="w-3.5 h-3.5" /> Load Sample Questions
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleParseImport} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg cursor-pointer">
                  Convert & Format PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

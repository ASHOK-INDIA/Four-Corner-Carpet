import React, { useState } from 'react';
import { 
  FileText, X, Plus, Copy, Download, Search, Wand2, Trash2, CheckCircle2, 
  Palette, Layout, ArrowUp, ArrowDown, Sparkles, Shuffle, Eye, EyeOff, RotateCcw, 
  HelpCircle, Check, XCircle, Award, BookOpen, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { generateRandomUPSC100Questions, UPSC_TOPICS, UPSCQuestion, UPSCTopic } from '../data/upscQuestionsData';
import { 
  extractTextFromPDFFile, 
  runOcrOnScannedPDF, 
  runOcrOnImageFile, 
  parseTextIntoUPSCQuestions, 
  ExtractedQuestionItem 
} from '../utils/pdfOcrHelper';

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
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-white text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
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
  const [docTitle, setDocTitle] = useState("संघ लोक सेवा आयोग (UPSC) - सिविल सेवा प्रारंभिक परीक्षा 2026");
  const [docSubTitle, setDocSubTitle] = useState("100 महत्वपूर्ण प्रश्न संग्रह (सभी 100 प्रश्नों के सही उत्तर ग्रीन हाइलाइट सहित)");
  const [docTopicTag, setDocTopicTag] = useState("UPSC 100 समग्र टेस्ट - सामान्य अध्ययन एवं गणित / सीसैट");
  const [docExamMeta, setDocExamMeta] = useState("समय: 2:00 घंटे | कुल प्रश्न: 100 | पूर्णांक: 200 | प्रत्येक सही उत्तर: 2 अंक | ऋणात्मक अंकन: 1/3 अंक");
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormulas, setShowFormulas] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isExtractingQuestions, setIsExtractingQuestions] = useState<boolean>(false);
  const [extractStatusText, setExtractStatusText] = useState<string>('');

  // UPSC 100 Questions & Interactive Quiz States
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [pdfStatusText, setPdfStatusText] = useState<string>('');

  // Fancy Customization States
  const [themeStyle, setThemeStyle] = useState<'classic' | 'amber' | 'emerald' | 'indigo'>('amber');
  const [isTwoColumn, setIsTwoColumn] = useState(false);
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [showWatermark, setShowWatermark] = useState(true);

  // Initialize with 100 authentic UPSC randomized questions
  const [questions, setQuestions] = useState<Question[]>(() => generateRandomUPSC100Questions('all'));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to activate mobile fit mode: large legible font, 1-column layout, edge-to-edge
  const handleEnableMobileFit = () => {
    setIsTwoColumn(false);
    setFontScale('lg');
    const el = document.getElementById('pdfStudioDocumentPage');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast('📱 मोबाइल फुल-फिट सक्रिय: बड़ा फॉन्ट और 100% स्क्रीन-फिट!');
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
    setShowAllAnswers(true);

    const topicObj = UPSC_TOPICS.find(t => t.id === targetTopic);
    if (topicObj) {
      setDocTopicTag(`${topicObj.nameHi}`);
      setDocSubTitle(`UPSC 100 महत्वपूर्ण प्रश्न संग्रह - ${topicObj.nameHi}`);
      showToast(`🎯 100 नए रैंडम प्रश्न लोड किए गए: ${topicObj.nameHi}!`);
    } else {
      showToast(`🎯 100 नए रैंडम UPSC प्रश्न लोड किए गए (उत्तर सीधे दृश्यमान)!`);
    }
  };

  // Toggle reveal for single question
  const handleToggleRevealAnswer = (qId: number) => {
    setRevealedAnswers(prev => {
      const current = prev[qId] !== undefined ? prev[qId] : showAllAnswers;
      return {
        ...prev,
        [qId]: !current
      };
    });
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
    setRevealedAnswers({});
    if (nextState) {
      showToast("सभी 100 सही उत्तर (हरा / Green) दिख रहे हैं!");
    } else {
      showToast("सभी उत्तर छुपा दिए गए हैं (अभ्यास मोड)!");
    }
  };

  // Reset quiz test
  const handleResetQuiz = () => {
    setRevealedAnswers({});
    setUserAnswers({});
    setShowAllAnswers(true);
    showToast("प्रैक्टिस टेस्ट रीसेट हो गया! सभी 100 सही उत्तर सीधे दिख रहे हैं।");
  };

  const handleResetInstituteHeader = () => {
    setInstituteName("BRIGHT CAMPUS BHADOHI");
    setInstituteTagline("ब्राइट कैंपस - सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र");
    setInstituteAddress("Chauri Rd, BADI BAGH, Bhadohi, Uttar Pradesh 221401");
    setInstituteContact("📞 संपर्क सूत्र: +91 87075 25421");
    setDocTitle("संघ लोक सेवा आयोग (UPSC) - सिविल सेवा प्रारंभिक परीक्षा 2026");
    setDocSubTitle("100 महत्वपूर्ण प्रश्न संग्रह (सभी 100 प्रश्नों के सही उत्तर ग्रीन हाइलाइट सहित)");
    setDocTopicTag("UPSC 100 समग्र टेस्ट - सामान्य अध्ययन एवं गणित / सीसैट");
    setDocExamMeta("समय: 2:00 घंटे | कुल प्रश्न: 100 | पूर्णांक: 200 | प्रत्येक सही उत्तर: 2 अंक | ऋणात्मक अंकन: 1/3 अंक");
    showToast("🏛️ हेडिंग Bright Campus Bhadohi विवरण पर रीसेट कर दी गई!");
  };

  // Calculate score statistics
  const attemptedCount = Object.keys(userAnswers).length;
  const correctCount = questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.ans.toLowerCase() ? acc + 1 : acc;
  }, 0);
  const wrongCount = attemptedCount - correctCount;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file works
    e.target.value = '';

    setAttachedFileName(file.name);
    setIsExtractingQuestions(true);
    setExtractStatusText(`फ़ाइल "${file.name}" का विश्लेषण शुरू हो रहा है...`);

    // Helper to format and apply extracted questions
    const applyQuestions = (extractedQuestions: ExtractedQuestionItem[], sourceMsg: string) => {
      const formatted: Question[] = extractedQuestions.map((q, idx) => ({
        id: Date.now() + idx,
        type: q.type || `TYPE-${(idx % 10) + 1}`,
        en: q.en || '',
        hi: q.hi || '',
        options: Array.isArray(q.options) && q.options.length === 4 
          ? q.options 
          : ["(a) विकल्प A", "(b) विकल्प B", "(c) विकल्प C", "(d) विकल्प D"],
        exam: q.exam || 'UPSC 2026',
        ans: (q.ans || 'a').toLowerCase().trim(),
        explanation: q.explanation || ''
      }));

      setQuestions(formatted);
      setShowAllAnswers(true);
      setRevealedAnswers({});
      setUserAnswers({});
      setIsImportModalOpen(false);

      const textPreview = formatted.map((q, i) => 
        `Q.${i + 1} ${q.hi}\n${q.options.join(' ')}\nAns: ${q.ans.toUpperCase()} [${q.exam}]\nव्याख्या: ${q.explanation || ''}`
      ).join('\n\n');
      setRawImportText(textPreview);

      showToast(`🎉 ${formatted.length} प्रश्न ${sourceMsg} से सफलतापूर्वक निकाले गए!`);
    };

    // Case 1: Plain text files
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text && text.trim().length > 0) {
          setRawImportText(text);
          const parsed = parseTextIntoUPSCQuestions(text);
          if (parsed.length > 0) {
            applyQuestions(parsed, 'टेक्स्ट फ़ाइल');
          } else {
            showToast(`✅ फ़ाइल टेक्स्ट लोड हुआ: ${file.name}`);
          }
        }
        setIsExtractingQuestions(false);
      };
      reader.readAsText(file);
      return;
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    // Step 1: If PDF, quickly check if embedded digital text exists
    if (isPdf) {
      setExtractStatusText(`PDF टेक्स्ट स्ट्रीम की जांच हो रही है (${file.name})...`);
      try {
        const directText = await extractTextFromPDFFile(file);
        if (directText && directText.trim().length > 50) {
          const parsed = parseTextIntoUPSCQuestions(directText);
          if (parsed.length > 0) {
            applyQuestions(parsed, 'PDF डिजिटल टेक्स्ट');
            setIsExtractingQuestions(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Direct PDF text extraction bypassed:', err);
      }
    }

    // Step 2: Try Server AI Multimodal OCR (if backend API key configured)
    try {
      setExtractStatusText(`AI OCR इंजन से प्रश्न पहचाने जा रहे हैं (${file.name})...`);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      const mimeType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

      const serverRes = await fetch('/api/extract-upsc-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType, fileName: file.name })
      });

      const serverData = await serverRes.json();
      if (serverData.success && Array.isArray(serverData.questions) && serverData.questions.length > 0) {
        applyQuestions(serverData.questions, 'AI OCR');
        setIsExtractingQuestions(false);
        return;
      }
    } catch (serverErr) {
      console.warn('Server OCR unavailable, switching to local OCR engine:', serverErr);
    }

    // Step 3: Local In-Browser OCR Engine (Tesseract.js + Canvas - 100% Offline & Works without keys!)
    try {
      if (isPdf) {
        setExtractStatusText('स्कैन की गई PDF से इमेज पृष्ठों का OCR हो रहा है...');
        const ocrText = await runOcrOnScannedPDF(file, (msg) => setExtractStatusText(msg));
        if (ocrText && ocrText.trim().length > 15) {
          const parsed = parseTextIntoUPSCQuestions(ocrText);
          if (parsed.length > 0) {
            applyQuestions(parsed, 'लोकल स्कैन OCR');
            setIsExtractingQuestions(false);
            return;
          } else {
            setRawImportText(ocrText);
            showToast('OCR से टेक्स्ट प्राप्त हुआ, कृपया नीचे देखकर फॉर्मेट करें।');
          }
        } else {
          showToast('⚠️ स्कैन पृष्ठों से टेक्स्ट नहीं पढ़ा जा सका। कृपया स्पष्ट छवि अपलोड करें।');
        }
      } else {
        // Image file (.jpg, .jpeg, .png, .webp)
        setExtractStatusText('इमेज फ़ाइल का OCR प्रारंभ हो रहा है...');
        const ocrText = await runOcrOnImageFile(file, (msg) => setExtractStatusText(msg));
        if (ocrText && ocrText.trim().length > 15) {
          const parsed = parseTextIntoUPSCQuestions(ocrText);
          if (parsed.length > 0) {
            applyQuestions(parsed, 'इमेज OCR');
            setIsExtractingQuestions(false);
            return;
          } else {
            setRawImportText(ocrText);
            showToast('OCR से टेक्स्ट प्राप्त हुआ, कृपया नीचे देखकर फॉर्मेट करें।');
          }
        } else {
          showToast('⚠️ इमेज से टेक्स्ट नहीं पढ़ा जा सका। कृपया स्पष्ट फोटो अपलोड करें।');
        }
      }
    } catch (localOcrErr: any) {
      console.error('Local OCR error:', localOcrErr);
      showToast('⚠️ OCR प्रक्रिया में समस्या आई। कृपया टेक्स्ट पेस्ट करें।');
    } finally {
      setIsExtractingQuestions(false);
    }
  };

  // AI Smart extraction when user pastes raw text into textarea
  const handleAIExtractFromText = async () => {
    if (!rawImportText.trim()) {
      showToast('कृपया पहले टेक्स्ट पेस्ट करें या फ़ाइल अटैच करें!');
      return;
    }

    setIsExtractingQuestions(true);
    setExtractStatusText('प्रश्नों का विश्लेषण एवं सही उत्तरों का मिलान हो रहा है...');

    // First try local fast UPSC question parser
    const localParsed = parseTextIntoUPSCQuestions(rawImportText);
    if (localParsed.length > 0) {
      const formatted: Question[] = localParsed.map((q, idx) => ({
        id: Date.now() + idx,
        type: q.type || `TYPE-${(idx % 10) + 1}`,
        en: q.en || '',
        hi: q.hi || '',
        options: Array.isArray(q.options) && q.options.length === 4 
          ? q.options 
          : ["(a) विकल्प A", "(b) विकल्प B", "(c) विकल्प C", "(d) विकल्प D"],
        exam: q.exam || 'UPSC 2026',
        ans: (q.ans || 'a').toLowerCase().trim(),
        explanation: q.explanation || ''
      }));

      setQuestions(formatted);
      setShowAllAnswers(true);
      setRevealedAnswers({});
      setUserAnswers({});
      setIsImportModalOpen(false);
      setIsExtractingQuestions(false);
      showToast(`🎉 ${formatted.length} प्रश्न स्मार्ट पार्सर द्वारा तैयार किए गए!`);
      return;
    }

    // Try server AI if local regex found no structured delimiters
    try {
      const res = await fetch('/api/extract-upsc-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawImportText,
          fileName: attachedFileName || 'Pasted Text'
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        const formattedQuestions: Question[] = data.questions.map((q: any, idx: number) => ({
          id: Date.now() + idx,
          type: q.type || `TYPE-${(idx % 10) + 1}`,
          en: q.en || q.questionEn || '',
          hi: q.hi || q.questionHi || q.question || '',
          options: Array.isArray(q.options) && q.options.length === 4 
            ? q.options 
            : ["(a) विकल्प A", "(b) विकल्प B", "(c) विकल्प C", "(d) विकल्प D"],
          exam: q.exam || 'UPSC 2026',
          ans: (q.ans || 'a').toLowerCase().trim(),
          explanation: q.explanation || ''
        }));

        setQuestions(formattedQuestions);
        setShowAllAnswers(true);
        setRevealedAnswers({});
        setUserAnswers({});
        setIsImportModalOpen(false);
        showToast(`🎉 ${formattedQuestions.length} प्रश्न AI द्वारा सफलतापूर्वक तैयार किए गए!`);
      } else {
        handleParseImport();
      }
    } catch (err) {
      console.error('AI Text Parse Error:', err);
      handleParseImport();
    } finally {
      setIsExtractingQuestions(false);
    }
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

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    const questionsToExport = filteredQuestions.length > 0 ? filteredQuestions : questions;
    if (questionsToExport.length === 0) {
      showToast("कोई प्रश्न उपलब्ध नहीं है!");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress(0);
    setPdfStatusText("PDF जनरेटर प्रारंभ हो रहा है...");

    // Yield to allow UI to show progress modal immediately
    await new Promise(r => setTimeout(r, 60));

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Split questions into clean A4 pages:
      // 4 questions per page gives generous vertical room for large 13.5px font, comfortable options, and full Hindi solutions
      const pages: { questions: Question[]; startIndex: number; isFirst: boolean; isLast: boolean }[] = [];
      const firstPageQuestions = questionsToExport.slice(0, 4);
      pages.push({ questions: firstPageQuestions, startIndex: 0, isFirst: true, isLast: questionsToExport.length <= 4 });

      let cursor = 4;
      while (cursor < questionsToExport.length) {
        const chunk = questionsToExport.slice(cursor, cursor + 4);
        const isLastChunk = (cursor + 4) >= questionsToExport.length;
        pages.push({ questions: chunk, startIndex: cursor, isFirst: false, isLast: isLastChunk });
        cursor += 4;
      }

      const totalPages = pages.length;

      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const pageData = pages[pIdx];
        setPdfStatusText(`पृष्ठ ${pIdx + 1} / ${totalPages} तैयार हो रहा है...`);
        setPdfProgress(Math.round(((pIdx) / totalPages) * 100));

        // Create temporary offscreen A4 container (A4 dimensions at standard 96 DPI: 794x1123)
        const pageEl = document.createElement('div');
        pageEl.style.position = 'fixed';
        pageEl.style.left = '-9999px';
        pageEl.style.top = '0';
        pageEl.style.width = '794px';
        pageEl.style.minHeight = '1123px';
        pageEl.style.backgroundColor = '#ffffff';
        pageEl.style.color = '#0f172a';
        pageEl.style.padding = '16px 20px';
        pageEl.style.boxSizing = 'border-box';
        pageEl.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        pageEl.style.zIndex = '-9999';
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.style.justifyContent = 'space-between';

        // 1. Watermark
        let watermarkHtml = '';
        if (showWatermark) {
          watermarkHtml = `
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; user-select: none; z-index: 0; overflow: hidden;">
              <div style="text-align: center; transform: rotate(-22deg); opacity: 0.10;">
                <div style="font-size: 38px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 2px;">
                  ${instituteName}
                </div>
                <div style="font-size: 12.5px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">
                  UPSC 100 प्रश्नोत्तरी मॉक टेस्ट • ब्राइट कैंपस भदोही (पृष्ठ ${pIdx + 1}/${totalPages})
                </div>
              </div>
            </div>
          `;
        }

        // 2. Header
        let headerHtml = '';
        if (pageData.isFirst) {
          headerHtml = `
            <div style="position: relative; z-index: 1; text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 8px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 2px;">
                🏛️ सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र 🎓
              </div>
              <h1 style="font-size: 23px; font-weight: 900; color: #020617; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">
                ${instituteName}
              </h1>
              <p style="font-size: 10.5px; font-weight: 700; color: #047857; margin: 2px 0;">
                ${instituteTagline}
              </p>
              <div style="font-size: 10px; font-weight: 600; color: #334155; margin: 2px 0;">
                <span>📍 ${instituteAddress}</span> • <span style="font-weight: 800; color: #b45309;">${instituteContact}</span>
              </div>
              <div style="font-size: 12.5px; font-weight: 900; color: #0f172a; margin-top: 3px;">
                ${docTitle}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; font-weight: 700; color: #475569; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #cbd5e1;">
                <span>${docExamMeta}</span>
                <span style="background: #0f172a; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 800;">
                  UPSC 100 संपूर्ण उत्तर कुंजी (Green)
                </span>
              </div>
            </div>
          `;
        } else {
          headerHtml = `
            <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 5px; margin-bottom: 8px; font-size: 10px; font-weight: 800; color: #0f172a;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="background: #0f172a; color: white; padding: 1.5px 6px; border-radius: 4px; font-size: 9px;">${instituteName}</span>
                <span>UPSC 100 महत्वपूर्ण प्रश्न संग्रह (उत्तर कुंजी सहित)</span>
              </div>
              <div style="color: #b45309; font-weight: 700;">
                ${instituteContact}
              </div>
            </div>
          `;
        }

        // 3. Questions (Large, bold, high-contrast, perfectly legible on mobile screens)
        const questionsHtml = pageData.questions.map((q, idx) => {
          const qNum = pageData.startIndex + idx + 1;
          const optionsList = q.options.map((opt, optIdx) => {
            const letter = ['a', 'b', 'c', 'd'][optIdx] || 'a';
            const isCorrect = q.ans.toLowerCase() === letter;
            return `
              <div style="
                padding: 6px 9px; 
                border-radius: 6px; 
                font-size: 11.5px; 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                ${isCorrect 
                  ? 'background: #059669; color: white; font-weight: 800; border: 1.5px solid #047857;' 
                  : 'background: #ffffff; color: #1e293b; font-weight: 600; border: 1px solid #cbd5e1;'}
              ">
                <span style="line-height: 1.35;">${opt}</span>
                ${isCorrect ? '<span style="background: white; color: #047857; font-size: 9px; font-weight: 900; padding: 1.5px 5px; border-radius: 3px; margin-left: 6px; shrink: 0;">✓ सही उत्तर</span>' : ''}
              </div>
            `;
          }).join('');

          return `
            <div style="position: relative; z-index: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; background-color: #f8fafc;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="background: #0f172a; color: white; font-size: 10.5px; font-weight: 900; padding: 2px 7px; border-radius: 4px;">
                    प्रश्न ${qNum}
                  </span>
                  <span style="background: #e2e8f0; color: #1e293b; font-size: 9.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 4px;">
                    ${q.type || 'UPSC परीक्षा'}
                  </span>
                  <span style="font-size: 9.5px; font-weight: 700; color: #475569;">
                    ${q.topic || ''}
                  </span>
                </div>
                <div style="background: #059669; color: white; font-size: 10.5px; font-weight: 900; padding: 2px 8px; border-radius: 5px;">
                  ✓ उत्तर: (${q.ans.toUpperCase()})
                </div>
              </div>

              <div style="font-size: 13px; color: #020617; font-weight: 800; margin-bottom: 6px; line-height: 1.45;">
                ${q.hi || q.en}
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 5px;">
                ${optionsList}
              </div>

              ${q.explanation ? `
                <div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 4px 8px; font-size: 10.5px; color: #064e3b; font-weight: 600; line-height: 1.4; border-radius: 0 4px 4px 0;">
                  <strong style="color: #047857; font-weight: 800;">व्याख्या / हल:</strong> ${q.explanation}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        // 4. If Last Page, add official Answer Key Grid summary
        let lastPageAppendixHtml = '';
        if (pageData.isLast) {
          lastPageAppendixHtml = `
            <div style="margin-top: 6px; border: 1.5px solid #0f172a; border-radius: 6px; padding: 6px; background: #ffffff;">
              <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-align: center; text-transform: uppercase;">
                ✓ उत्तर कुंजी (OFFICIAL ANSWER KEY - COMPLETE 100 QUESTIONS)
              </div>
              <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; text-align: center; font-size: 8px;">
                ${questionsToExport.slice(0, 100).map((q, aIdx) => `
                  <div style="border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 0; background: #f0fdf4;">
                    <div style="font-weight: 600; color: #475569; font-size: 7.5px;">${aIdx + 1}</div>
                    <div style="font-weight: 900; color: #059669; font-size: 8.5px;">${q.ans.toUpperCase()}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        // 5. Footer
        const footerHtml = `
          <div style="position: relative; z-index: 1; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; font-weight: 700; color: #64748b;">
            <span>${instituteName} • Bhadohi (U.P.) • ${instituteContact}</span>
            <span>पृष्ठ ${pIdx + 1} / ${totalPages}</span>
          </div>
        `;

        pageEl.innerHTML = `
          ${watermarkHtml}
          <div>
            ${headerHtml}
            ${questionsHtml}
            ${lastPageAppendixHtml}
          </div>
          ${footerHtml}
        `;

        document.body.appendChild(pageEl);

        // Allow micro-task for layout
        await new Promise(r => setTimeout(r, 10));

        const canvas = await html2canvas(pageEl, {
          scale: 1.8,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        if (pIdx > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

        document.body.removeChild(pageEl);

        // Update progress
        const pct = Math.round(((pIdx + 1) / totalPages) * 100);
        setPdfProgress(pct);

        // Yield to event loop to keep browser completely responsive
        await new Promise(r => setTimeout(r, 15));
      }

      setPdfProgress(100);
      setPdfStatusText("PDF डाउनलोड हो रहा है...");
      await new Promise(r => setTimeout(r, 50));

      pdf.save('BRIGHT_CAMPUS_BHADOHI_UPSC_100_QNA.pdf');
      showToast("✅ PDF सफलतापूर्वक डाउनलोड हो गया!");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      showToast("PDF जनरेशन में समस्या। कृपया 'Print' बटन का उपयोग करें।");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(0);
      setPdfStatusText('');
    }
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
      case 'sm': return 'text-xs sm:text-xs';
      case 'md': return 'text-sm sm:text-sm md:text-base';
      case 'lg': return 'text-base sm:text-base md:text-lg';
      case 'xl': return 'text-lg sm:text-lg md:text-xl';
      default: return 'text-base sm:text-base md:text-lg';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto flex flex-col">
      
      {/* Progress Modal during PDF Generation */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wide">UPSC 100 PDF तैयार हो रहा है...</h4>
              <p className="text-xs text-amber-300 font-bold mt-1.5">{pdfStatusText}</p>
              <p className="text-[11px] text-slate-400 mt-1">ब्राउज़र सुरक्षित एवं सक्रिय है (बिना किसी हैंग/एरर के)</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-200" 
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>प्रगति: {pdfProgress}%</span>
              <span className="text-amber-400">BRIGHT CAMPUS BHADOHI</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm flex items-center gap-3 z-50 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-xl px-2.5 sm:px-4 py-2 sm:py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 no-print">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 p-2 sm:p-2.5 rounded-xl font-black shadow-lg">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold leading-tight flex items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[170px] sm:max-w-none">{instituteName}</span>
              <span className="text-[9px] sm:text-[10px] bg-amber-400 text-slate-950 font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                UPSC 100 Q&A
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-300 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="truncate max-w-[150px] sm:max-w-none">📍 {instituteAddress}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-amber-300 font-semibold">{instituteContact}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPdf}
            className={`bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 sm:gap-2 transition shadow-xl cursor-pointer ${
              isGeneratingPdf ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            title="सम्पूर्ण 100 प्रश्न व उत्तर सीधे PDF फाइल में डाउनलोड करें"
          >
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isGeneratingPdf ? `PDF बन रहा है (${pdfProgress}%)` : '📥 PDF डाउनलोड'}</span>
          </button>
          <button 
            onClick={handlePrint} 
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1 sm:gap-1.5 transition border border-amber-500/40 cursor-pointer shadow-sm" 
            title="ब्राउज़र से तुरंत प्रिंट करें या 'Save as PDF' करें (0 सेकंड)"
          >
            🖨️ प्रिंट / सेव
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-lg cursor-pointer">
            <FileText className="w-3 h-3" /> 📥 आयात
          </button>
          <button onClick={handleAddNewQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow cursor-pointer">
            <Plus className="w-3 h-3" /> ➕ नया
          </button>
          <button onClick={handleCopyAll} className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition border border-slate-700 cursor-pointer">
            <Copy className="w-3 h-3" /> 📋 कॉपी
          </button>
          <button onClick={onClose} className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-1.5 sm:p-2 rounded-xl transition cursor-pointer" title="स्टूडियो बंद करें">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Fancy Customization Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs text-slate-300 sticky top-[53px] sm:top-[65px] z-30 shadow-md no-print">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Dedicated Mobile Fit Button */}
          <button
            onClick={handleEnableMobileFit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer shadow-md text-xs border border-emerald-300"
            title="मोबाइल स्क्रीन पर 100% फिट और बड़ा फॉन्ट दृश्य सक्रिय करें"
          >
            <span>📱</span>
            <span>मोबाइल फुल-फिट (Bada & Fit)</span>
          </button>

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
            <span>{isEditHeaderOpen ? 'हेडिंग एडिटर छुपाएं' : 'हेडिंग एडिट करें'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-700">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white hidden xs:inline">थीम:</span>
            <select 
              value={themeStyle} 
              onChange={(e) => setThemeStyle(e.target.value as any)}
              className="bg-slate-900 text-amber-300 font-bold px-2 py-0.5 sm:py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              <option value="amber">रॉयल अंबर</option>
              <option value="emerald">एमराल्ड हरा</option>
              <option value="indigo">इंडिगो</option>
              <option value="classic">क्लासिक</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-700">
            <Layout className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white hidden xs:inline">कॉलम:</span>
            <button 
              onClick={() => setIsTwoColumn(!isTwoColumn)}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${isTwoColumn ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
            >
              {isTwoColumn ? '2 कॉलम' : '1 कॉलम'}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-700">
            <span className="font-bold text-white text-[11px] sm:text-xs">फॉन्ट:</span>
            {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
              <button 
                key={s} 
                onClick={() => setFontScale(s)}
                className={`px-1.5 sm:px-2 py-0.5 rounded-md font-extrabold text-[11px] sm:text-xs transition cursor-pointer ${fontScale === s ? 'bg-amber-400 text-slate-950 shadow-xs' : 'bg-slate-900 text-slate-300 hover:text-white'}`}
                title={s === 'sm' ? 'छोटा' : s === 'md' ? 'मध्यम' : s === 'lg' ? 'बड़ा (सुझावित)' : 'विशाल (Super Big)'}
              >
                {s === 'sm' ? 'छोटा' : s === 'md' ? 'मध्यम' : s === 'lg' ? 'बड़ा' : 'विशाल'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-700">
            <label className="flex items-center gap-1.5 font-bold text-white cursor-pointer select-none text-xs">
              <input 
                type="checkbox" 
                checked={showWatermark} 
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0 cursor-pointer"
              />
              वॉटरमार्क
            </label>
          </div>
        </div>

        <div className="text-slate-400 italic text-[11px] hidden md:block">
          💡 नीचे शीट पर किसी भी टेक्स्ट पर क्लिक करके सीधे एडिट कर सकते हैं!
        </div>
      </div>

      <main className="max-w-5xl mx-auto my-1.5 sm:my-6 px-1.5 sm:px-4 flex-1 w-full space-y-3 sm:space-y-5">
        
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
                  हर बार 100 नए रैंडम प्रश्न • सभी 100 सही उत्तर (Green) सीधे बिना क्लिक किए दिख रहे हैं • विषय (Topic) चुनें
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
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm' 
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
                }`}
                title="सभी 100 प्रश्नों के सही उत्तर टॉगल करें"
              >
                {showAllAnswers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showAllAnswers ? '✓ उत्तर दिख रहे हैं (Active)' : 'उत्तर दिखाएं (Show Answers)'}</span>
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
                <span>विषय चुनें (UPSC 100 महत्वपूर्ण प्रश्न संकलन):</span>
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
            <span>सक्रिय टेस्ट पेपर: <strong className="text-amber-400">{instituteName} • {docTitle}</strong></span>
          </div>
          <div className="relative flex-1 sm:flex-initial">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="प्रश्न या विषय खोजें..." 
              className="bg-slate-900 text-xs text-white px-3 py-2 pl-8 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 w-full sm:w-64"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          </div>
        </div>

        {/* Document Canvas */}
        <div id="pdfStudioDocumentPage" className={`relative bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-3 sm:p-8 md:p-12 border border-slate-200 text-slate-900 w-full overflow-hidden ${getFontSizeClass()}`}>
          
          {/* Watermark Stamp Overlay - 15 Visible Watermarks evenly distributed */}
          {showWatermark && (
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex flex-col justify-around py-8">
              {Array.from({ length: 15 }).map((_, idx) => (
                <div key={idx} className="text-center transform -rotate-12 my-6 sm:my-8 px-2" style={{ opacity: 0.12 }}>
                  <span className="block text-slate-900 font-black text-2xl sm:text-5xl md:text-6xl tracking-wider uppercase truncate">
                    BRIGHT CAMPUS BHADOHI
                  </span>
                  <span className="block text-slate-800 font-extrabold text-[10px] sm:text-sm md:text-base tracking-wide uppercase mt-0.5 truncate">
                    UPSC 100 प्रश्नोत्तरी मॉक टेस्ट • ब्राइट कैंपस भदोही ({idx + 1}/15)
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="relative z-10">
            {/* Institute Official Header Branding */}
            <div className="text-center border-b-2 border-slate-900 pb-4 sm:pb-5 mb-5 sm:mb-6">
              {/* Top Seal / Badge */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg sm:text-xl">🏛️</span>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-700 bg-slate-100 border border-slate-300 px-3 sm:px-3.5 py-0.5 rounded-full">
                  सिविल सर्विसेज एवं प्रतियोगी परीक्षा मार्गदर्शन केंद्र
                </span>
                <span className="text-lg sm:text-xl">🎓</span>
              </div>

              {/* Main Institute Name */}
              <h1 
                contentEditable 
                suppressContentEditableWarning 
                className="text-xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-wider uppercase outline-none hover:bg-amber-50 focus:bg-amber-50 px-2 sm:px-3 py-1 rounded transition border border-transparent hover:border-amber-300 cursor-text break-words"
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
                  UPSC 100 महत्वपूर्ण प्रश्न संकलन
                </h3>
                <span className="text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold">
                  {filteredQuestions.length} प्रश्न
                </span>
              </div>

              <div className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>सभी 100 प्रश्नों के सही उत्तर (Green) सीधे बिना क्लिक किए दिख रहे हैं</span>
              </div>
            </div>

            {/* Questions List (Supports 1 or 2 columns layout) */}
            <div className={`${isTwoColumn ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'} mb-8`}>
              {filteredQuestions.map((q, index) => {
                const isAnswerRevealed = revealedAnswers[q.id] !== undefined ? revealedAnswers[q.id] : showAllAnswers;
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
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-slate-200 pb-2 mb-2.5 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-md" contentEditable suppressContentEditableWarning>
                          प्रश्न {index + 1}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${currentTheme.badgeBg}`} contentEditable suppressContentEditableWarning>
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
                          title="उत्तर टॉगल करें"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAnswerRevealed ? `उत्तर: (${q.ans.toUpperCase()})` : 'उत्तर देखें'}</span>
                        </button>

                        <div className="flex items-center gap-1 no-print">
                          <button onClick={() => handleMoveUp(index)} className="text-xs text-slate-400 hover:text-slate-900 p-1 cursor-pointer" title="ऊपर ले जाएं">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleMoveDown(index)} className="text-xs text-slate-400 hover:text-slate-900 p-1 cursor-pointer" title="नीचे ले जाएं">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDuplicateQuestion(index)} className="text-xs text-slate-400 hover:text-indigo-600 p-1 cursor-pointer" title="कॉपी करें">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(index)} className="text-xs text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="हटाएं">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Text in Pure Hindi (Bigger & High Legibility) */}
                    <div className="space-y-1.5 mb-3">
                      <p 
                        className={`text-slate-950 font-bold leading-relaxed outline-none focus:bg-blue-50 px-1 rounded ${
                          fontScale === 'sm' ? 'text-sm sm:text-base' :
                          fontScale === 'lg' ? 'text-lg sm:text-xl font-extrabold' :
                          fontScale === 'xl' ? 'text-xl sm:text-2xl font-black' :
                          'text-base sm:text-lg'
                        }`} 
                        contentEditable 
                        suppressContentEditableWarning
                      >
                        {q.hi || q.en}
                      </p>
                    </div>

                    {/* Options Grid (Clickable & Highlights Correct Answer in Green, Big on Mobile) */}
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
                              <span className="text-xs sm:text-[11px] bg-white text-emerald-800 px-2 py-0.5 rounded font-black tracking-wide uppercase ml-2 shadow-xs shrink-0">
                                ✓ सही उत्तर
                              </span>
                            );
                          } else if (isUserSelected && !isCorrectOption) {
                            // SHOW RED ON WRONG PICK
                            optionStyle = "bg-rose-50 text-rose-800 border-2 border-rose-500 font-bold line-through";
                            badgeContent = (
                              <span className="text-xs sm:text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold ml-2 shrink-0">
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
                            className={`p-3 sm:p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              fontScale === 'sm' ? 'text-xs sm:text-sm' :
                              fontScale === 'lg' ? 'text-base sm:text-base' :
                              fontScale === 'xl' ? 'text-base sm:text-lg' :
                              'text-sm sm:text-base'
                            } ${optionStyle}`}
                          >
                            <span contentEditable suppressContentEditableWarning className="outline-none flex-1 leading-snug font-semibold">
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
                          सटीक उत्तर: ({q.ans.toUpperCase()})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleRevealAnswer(q.id)}
                          className="text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                        >
                          उत्तर दिखाएं ({q.ans.toUpperCase()})
                        </button>
                      )}
                    </div>

                    {/* Explanation Box if revealed */}
                    {isAnswerRevealed && q.explanation && (
                      <div className={`mt-2.5 pt-2 border-t border-emerald-200/60 bg-emerald-50/80 p-3 sm:p-2.5 rounded-xl text-emerald-950 font-medium leading-relaxed ${
                        fontScale === 'lg' || fontScale === 'xl' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                      }`}>
                        <span className="font-black text-emerald-900 mr-1 block sm:inline mb-1 sm:mb-0">📚 व्याख्या एवं हल:</span>
                        <span>{q.explanation}</span>
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
                    <span>सभी 100 उत्तर कॉपी करें</span>
                  </button>
                </div>
              </div>

              {/* Numbered 1 to 100 Answer Key Grid */}
              <div id="pdfStudioAnswerGrid" className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 text-center font-bold">
                {questions.map((q, idx) => (
                  <div 
                    key={idx} 
                    className="bg-emerald-50/80 border border-emerald-200 p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-center hover:bg-emerald-100 transition"
                  >
                    <span className="text-slate-500 text-[10px] sm:text-xs">{idx + 1}</span>
                    <span className="text-emerald-700 font-black uppercase text-xs sm:text-sm">
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
                1. प्रमाणिक संदर्भ स्रोत: संघ लोक सेवा आयोग (UPSC) सिविल सेवा प्रारंभिक परीक्षा विगत वर्ष प्रश्न पत्र, NCERT पाठ्यपुस्तकें एवं मानक प्रतियोगी संदर्भ ग्रंथ।
              </p>
              <p className="outline-none focus:bg-blue-50 p-1 rounded" contentEditable suppressContentEditableWarning>
                2. परीक्षार्थियों हेतु निर्देश: प्रत्येक प्रश्न में 4 बहुविकल्पीय उत्तर दिए गए हैं। सही उत्तर को हरे रंग (Green) में विशेष रूप से रेखांकित किया गया है। प्रत्येक मॉक टेस्ट में 100 नए प्रश्न संकलित किए जाते हैं।
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

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              अपनी <strong>स्कैन की गई PDF, फोटो (JPG/PNG), या सामान्य PDF</strong> अटैच करें या नीचे टेक्स्ट पेस्ट करें। हमारा <strong>AI OCR इंजन</strong> इमेज से भी हिंदी प्रश्न, चारों विकल्प और सही उत्तर तुरंत निकालकर सीधे टेस्ट पेपर में फॉर्मेट कर देगा।
            </p>

            {isExtractingQuestions && (
              <div className="mb-3 p-4 bg-amber-500/15 border border-amber-500/40 rounded-xl text-center space-y-2 animate-in fade-in">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs sm:text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>{extractStatusText || "AI OCR द्वारा स्कैन/इमेज PDF का विश्लेषण हो रहा है..."}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  स्कैन की गई इमेज/PDF से हिंदी व अंग्रेजी प्रश्न, विकल्प (A,B,C,D) और समाधान निकाले जा रहे हैं...
                </p>
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-xl gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-black hover:bg-amber-500/30 cursor-pointer transition shadow-xs">
                  <FileText className="w-4 h-4 text-amber-400" /> 
                  <span>📁 PDF या फोटो अटैच करें (AI OCR सपोर्ट)</span>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" 
                    onChange={handleFileUpload} 
                    disabled={isExtractingQuestions}
                    className="hidden" 
                  />
                </label>
                {attachedFileName ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    ✓ चयनित: {attachedFileName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">PDF, JPG, PNG समर्थित (स्कैन की गई इमेज भी)</span>
                )}
              </div>
              {attachedFileName && !isExtractingQuestions && (
                <button 
                  onClick={() => { setAttachedFileName(null); setRawImportText(""); }} 
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
                >
                  हटाएं (Remove)
                </button>
              )}
            </div>

            <textarea 
              rows={9} 
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              disabled={isExtractingQuestions}
              placeholder="यहाँ प्रश्न पेस्ट करें या ऊपर से PDF/इमेज अपलोड करें...
उदाहरण:
Q.1 1600 रुपये का 2% की दर से 8 वर्ष का साधारण ब्याज कितना होगा?
(a) 256 (b) 240 (c) 248 (d) 340
Ans: a [UPSC CSAT 2026]
व्याख्या: SI = (P*R*T)/100 = (1600*2*8)/100 = 256 रुपये।" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button 
                onClick={() => {
                  setRawImportText(`Q.1 2000 रुपये पर 6.5% वार्षिक दर से 13 फरवरी से 27 अप्रैल तक का ब्याज कितना होगा?
(a) 25 (b) 26 (c) 24 (d) 27
Ans: b [UPSC CSAT 2026]

Q.2 साधारण ब्याज पर कोई राशि 5 वर्षों में दोगुनी हो जाती है। ब्याज दर क्या है?
(a) 20% (b) 25% (c) 30% (d) 40%
Ans: a [UPSC CSAT 2026]

Q.3 5000 रुपये की राशि 6% और 9% साधारण ब्याज पर दी गई। वार्षिक ब्याज 390 रुपये है, तो 6% पर उधार राशि है:
(a) 2000 रुपये (b) 2500 रुपये (c) 3000 रुपये (d) 3500 रुपये
Ans: a [UPSC CSAT 2026]`);
                }} 
                disabled={isExtractingQuestions}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <Wand2 className="w-3.5 h-3.5" /> नमूना प्रश्न लोड करें
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setIsImportModalOpen(false)} 
                  disabled={isExtractingQuestions}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  बंद करें
                </button>
                <button 
                  onClick={handleAIExtractFromText} 
                  disabled={isExtractingQuestions || !rawImportText.trim()}
                  className={`px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer ${
                    (isExtractingQuestions || !rawImportText.trim()) ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  title="AI से प्रश्न, विकल्प और उत्तर पहचानें"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>✨ AI स्मार्ट निष्कर्षण</span>
                </button>
                <button 
                  onClick={handleParseImport} 
                  disabled={isExtractingQuestions || !rawImportText.trim()}
                  className={`px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition shadow-md cursor-pointer ${
                    (isExtractingQuestions || !rawImportText.trim()) ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  सामान्य फॉर्मेट करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

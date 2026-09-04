import React, { useState, useRef, useEffect } from 'react';
import { callGeminiAPI } from '../../utils/gemini';
import { FormattedText } from '../../utils/textParser';
import { getAccountTotalsForMonth } from '../../utils/calculations';
import { fmtILS } from '../../utils/formatters';

export default function AIAdvisorTab({ roomStats, budgetTotals, accounts, selectedMonth, users }) {
  const [aiAuditReport, setAiAuditReport] = useState('');
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'שלום! אני היועץ הפיננסי האישי שלכם ב-AI. אני מקושר בזמן אמת לנתוני התיק והתקציב שלכם. איך אוכל לעזור היום?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatContainerRef = useRef(null);

  // Smoothly scroll only the chat container without causing horizontal shifts on the main page
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const generateFullAudit = async () => {
    setIsGeneratingAudit(true);
    try {
      const personalBreakdownStr = users.map(m => {
        const memberUid = m.uid || m.id;
        const accs = accounts.filter(a => a.ownerId === memberUid);
        const totals = getAccountTotalsForMonth(accs, selectedMonth);

        const accDetails = accs.map(acc => {
          const bal = acc.balances?.[selectedMonth] ?? 0;
          const catName = acc.category === 'short' ? 'נזיל מיידי / טווח קצר'
            : acc.category === 'medium' ? 'נזיל מושקע / טווח בינוני'
            : acc.category === 'long' ? 'לא נזיל / טווח ארוך (פנסיוני)'
            : 'התחייבות';
          return `    - ${acc.name} [${catName}]: ${fmtILS(bal)}`;
        }).join('\n');

        return `* פרופיל ${m.displayName || m.name}:
  סך הון נטו: ${fmtILS(totals.netWorth)} | נזיל (קצר + בינוני): ${fmtILS(totals.liquid)} | לא נזיל: ${fmtILS(totals.nonLiquid)} | התחייבויות: ${fmtILS(totals.liabilities)}
  פירוט חשבונות ונכסים קיימים:
${accDetails || '    (אין חשבונות מוגדרים)'}`;
      }).join('\n\n');

      const systemInstruction = `אתה מנוע ניתוח פיננסי בכיר (Executive Financial Intelligence). תפקידך להפיק דוח תמציתי, אנליטי ומדויק ברמת Executive Financial Dashboard Summary עבור משק הבית.

כללי ניסוח ומקצועיות מחייבים (Strict Rules):
1. ללא פנייה אישית או מבנה מכתב: אסור בתכלית האיסור לפתוח ב"שלום", "לכבוד", "בברכה", "שלום רב", "אני שמח להציג" וכדומה. פתח מיד בכותרת הראשונה של הדוח!
2. ללא פסקאות סיכום מתקתקות: אסור להוסיף פסקאות סיכום, איחולי הצלחה או מילות פרידה בסוף. הסעיף האחרון בדוח חייב להיות שורת הצעדים האופרטיביים בלבד!
3. סגנון ישיר, אנליטי וחד: ללא "טקסט ממלא" או קלישאות. כל משפט מעניק ערך ותובנה כמותית או מבנית.
4. הדגשות: חובה להשתמש ב-**בולד** על מספרים, יחסים, אחוזים ומדדי מפתח קריטיים כדי להבטיח סריקה מהירה ומיידית.
5. הבחנה פיננסית קריטית לגבי "הון נזיל": הון נזיל אינו שווה ערך למזומן בלתי מושקע, עו"ש או "כסף ששוכב סתם" (Cash Drag)! הון נזיל במערכת כולל גם תיקי השקעות ממוסים, קרנות כספיות, קופות גמל להשקעה וכדומה. חל איסור מוחלט להניח שכל ההון הנזיל אינו מושקע!
6. סריקה פרטנית של החשבונות: עליך לסרוק כל חשבון וחשבון של כל משתמש מתוך הפירוט, לאבחן מתוך שמות החשבונות והקטגוריות איפה הכסף נמצא בפועל (כמה יושב כנזילות מידית/עו"ש/פקדונות, וכמה מושקע בשוק ההון/מכשירים נזילים מניבים), ולהתייחס לכך ישירות באבחון הקצאת הנכסים ובצעדים האופרטיביים.
7. אורך מאוזן וממוקד: שמור על היקף של כ-400-500 מילים.`;

      const prompt = `
נתוני התיק והתקציב של משק הבית (חודש עבודה: ${selectedMonth}):

מאקרו והון משותף:
- סך הון נטו: ${fmtILS(roomStats.netWorth)}
- הון נזיל (טווח קצר + בינוני): ${fmtILS(roomStats.liquid)} (${roomStats.netWorth > 0 ? ((roomStats.liquid / roomStats.netWorth) * 100).toFixed(1) : 0}% מההון)
- הון פנסיוני / לא נזיל: ${fmtILS(roomStats.nonLiquid)} (${roomStats.netWorth > 0 ? ((roomStats.nonLiquid / roomStats.netWorth) * 100).toFixed(1) : 0}% מההון)
- סך התחייבויות: ${fmtILS(roomStats.liabilities)}
- חודשי כיסוי קרן חירום: ${roomStats.emergencyMonths.toFixed(1)} חודשים

תזרים ותקציב חודשי:
- הכנסה חודשית נטו: ${fmtILS(budgetTotals.totalIncome)}
- הוצאות קבועות: ${fmtILS(budgetTotals.totalFixed)} (${budgetTotals.fixedPct.toFixed(1)}% מההכנסה)
- הוצאות משתנות: ${fmtILS(budgetTotals.totalVar)} (${budgetTotals.varPct.toFixed(1)}% מההכנסה)
- שיעור חיסכון והשקעה חודשי: ${fmtILS(budgetTotals.totalSavings)} (${budgetTotals.savingsPct.toFixed(1)}% מההכנסה)

פירוט מלא של פרופילים וכל החשבונות:
${personalBreakdownStr}

עליך לבנות את הדוח במבנה Markdown קבוע, הכולל כותרות משנה (##) ובולטים (*) בלבד, לפי 4 הסעיפים הבאים:

## סקירת מצב ותובנות מאקרו
סיכום תמציתי של יחס נזילות, קצב צמיחה והלימות קרן החירום. אין לחזור סתמית על המספרים הגולמיים, אלא להסביר בחדות מה הם מעידים על החוסן הפיננסי של הבית. הדגש ב-**בולד** כל יחס ומדד מפתח.

## ניתוח תזרים ויעילות חודשית
אבחון מעמיק של יחסי התקציב (הכנסה מול הוצאות קבועות/משתנות מול שיעור חיסכון נקי). הצבע על "צווארי בקבוק", סעיפים כבדים והזדמנויות ברורות להתייעלות והגדלת שיעור החיסכון.

## אופטימיזציית נכסים ופערים
סריקה פרטנית של כל חשבונות ונכסי הפרופילים. אבחן במדויק היכן מושקע ההון הנזיל (הפרדה ברורה בין עו"ש/פקדונות שקליים לבין תיקי השקעות, קרנות כספיות וקופות גמל להשקעה). ציין פערים בחלוקת ההון בין בני הזוג, פיזור בין טווח קצר/בינוני/ארוך, והזדמנויות לאופטימיזציית מיסוי ותשואה.

## צעדים אופרטיביים מומלצים
הצג בדיוק 3-4 צעדים קצרים, ברורים ומעשיים (Action Items) שניתן ליישם מיד, המבוססים על סריקת החשבונות הפרטנית (למשל: ניתוב כספי עו"ש עודפים לאפיקים מניבים, ניצול הטבות מס, או התאמת מסלולים). נסח כל צעד כבולט (*) עם הדגשת **בולד** על הפעולה והסכומים/יעדים.

(תזכורת קריטית: התחל ישר בכותרת הראשונה. ללא פתיח, ללא משפטי נימוס, וללא פסקת סיום).
`;

      const response = await callGeminiAPI(prompt, systemInstruction);
      setAiAuditReport(response);
    } catch (err) {
      console.error("Error generating full audit report:", err);
      setAiAuditReport(err.message || "אירעה שגיאה ביצירת הדוח. אנא נסה שוב.");
    } finally {
      setIsGeneratingAudit(false);
    }
  };

  const handleSendMessage = async () => {
    const textToSend = userInput;
    if (!textToSend.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', text: textToSend }];
    setChatMessages(newMessages);
    setUserInput('');
    setIsSendingMessage(true);

    try {
      const prompt = `
נתונים משותפים של התיק:
- הון משותף: ${fmtILS(roomStats.netWorth)}
- נזיל משותף: ${fmtILS(roomStats.liquid)}
- תקציב הכנסה: ${fmtILS(budgetTotals.totalIncome)} | תקציב הוצאות: ${fmtILS(budgetTotals.totalFixed + budgetTotals.totalVar)}

שאלה של המשתמש: "${textToSend}"

ענה בעברית בצורה ממוקדת, מקצועית וישימה.
      `;

      const aiReply = await callGeminiAPI(prompt, "אתה יועץ פיננסי בכיר בישראל. ענה בעברית בצורה ישירה, אנליטית ומעשית, ללא פתיחים או גינונים מיותרים, עם הדגשות בולד על נתונים ומספרים קריטיים.");
      setChatMessages([...newMessages, { role: 'assistant', text: aiReply }]);
    } catch (err) {
      console.error("Error handling AI chat message:", err);
      setChatMessages([...newMessages, { role: 'assistant', text: err.message || "מצטערים, התקבלה שגיאה בתקשורת. אנא נסה שוב." }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main AI Advisor Panel */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
              <span>יועץ פיננסי אישי (AI)</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              ניתוח מקיף, אופטימיזציית תקציב וצ'אט פיננסי המחובר בזמן אמת לנתונים המשותפים והאישיים במערכת.
            </p>
          </div>

          <button
            type="button"
            onClick={generateFullAudit}
            disabled={isGeneratingAudit}
            className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {isGeneratingAudit ? (
              <>
                <div className="w-4 h-4 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin"></div>
                <span>מכין דוח ייעוץ מקיף...</span>
              </>
            ) : (
              <>
                <span>✦ הפק דוח ייעוץ פיננסי מלא</span>
              </>
            )}
          </button>
        </div>

        {aiAuditReport && (
          <div className="bg-[#FAF7F2] p-4 sm:p-6 rounded-2xl border border-[#E8E2D8] space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 border-b border-[#E8E2D8] pb-2">דוח אבחון וייעוץ פיננסי</h3>
            <FormattedText text={aiAuditReport} />
          </div>
        )}
      </div>

      {/* Interactive Chat */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-stone-900">צ'אט ייעוץ פיננסי אישי</h3>

        <div
          ref={chatContainerRef}
          className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl p-3 sm:p-4 max-h-96 overflow-y-auto space-y-3 sm:space-y-4"
        >
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl p-3 sm:p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] font-bold' 
                    : 'bg-[#FFFFFF] text-stone-900 border border-[#E8E2D8] shadow-xs'
                }`}
              >
                {msg.role === 'assistant' ? <FormattedText text={msg.text} /> : msg.text}
              </div>
            </div>
          ))}
          {isSendingMessage && (
            <div className="flex justify-start">
              <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E8E2D8] text-xs text-stone-500 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin"></div>
                <span>היועץ מעבד תשובה...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="שאל כל שאלה פיננסית..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 min-w-0 bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs sm:text-sm rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-[#4A90E2]"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isSendingMessage || !userInput.trim()}
            className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            שלח
          </button>
        </div>
      </div>
    </div>
  );
}

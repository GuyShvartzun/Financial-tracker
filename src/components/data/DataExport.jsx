import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { sortMonths } from '../../utils/calculations';
import { normalizeCurrencyCode } from '../../utils/formatters';
import { DEFAULT_CALCULATORS_DATA, DEFAULT_TASKS } from '../../constants/initialData';

export default function DataExport({
  accounts = [],
  budget = { incomes: [], fixedExpenses: [], variableExpenses: [], savings: [] },
  monthsList = [],
  users = [],
  syncAccountToCloud,
  deleteAccountFromCloud,
  syncBudgetToCloud,
  syncMonthsToCloud,
  setAccounts,
  setBudget,
  setMonthsList,
  setSelectedPersonalUserId,
  authUser,
  calculatorsData = DEFAULT_CALCULATORS_DATA,
  setCalculatorsData,
  syncCalculatorsToCloud,
  tasks = [],
  setTasks,
  syncTasksToCloud,
  roomName = '',
  currentRoom = null,
  selectedMonth = '',
  setSelectedMonth = null,
  isPrivacyMode = false,
  isDarkMode = false
}) {
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('success'); // 'success' | 'error' | 'info'

  // User Mapping Modal State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [userMapping, setUserMapping] = useState({});
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Category dictionaries (Hebrew <-> English)
  const catToHeb = { 
    short: 'טווח קצר', 
    medium: 'טווח בינוני', 
    long: 'טווח ארוך', 
    liability: 'התחייבויות' 
  };

  const hebToCat = { 
    'טווח קצר': 'short', 
    'קצר': 'short',
    'טווח בינוני': 'medium', 
    'בינוני': 'medium',
    'טווח ארוך': 'long', 
    'ארוך': 'long',
    'התחייבויות': 'liability',
    'התחייבות': 'liability',
    'short': 'short',
    'medium': 'medium',
    'long': 'long',
    'liability': 'liability'
  };

  const budgetToHeb = { 
    incomes: 'הכנסה', 
    fixedExpenses: 'הוצאה קבועה', 
    variableExpenses: 'הוצאה משתנה', 
    savings: 'חיסכון והשקעה' 
  };

  const hebToBudget = { 
    'הכנסה': 'incomes', 
    'הכנסות': 'incomes',
    'incomes': 'incomes',
    'income': 'incomes',
    'הוצאה קבועה': 'fixedExpenses', 
    'הוצאות קבועות': 'fixedExpenses',
    'fixedExpenses': 'fixedExpenses',
    'fixed': 'fixedExpenses',
    'הוצאה משתנה': 'variableExpenses', 
    'הוצאות משתנות': 'variableExpenses',
    'variableExpenses': 'variableExpenses',
    'variable': 'variableExpenses',
    'חיסכון והשקעה': 'savings', 
    'חיסכון': 'savings',
    'חסכונות': 'savings',
    'השקעה': 'savings',
    'savings': 'savings'
  };

  const priorityToHeb = {
    high: 'גבוהה',
    medium: 'בינונית',
    low: 'נמוכה'
  };

  const hebToPriority = {
    'גבוהה': 'high',
    'גבוה': 'high',
    'high': 'high',
    'בינונית': 'medium',
    'בינוני': 'medium',
    'medium': 'medium',
    'נמוכה': 'low',
    'נמוך': 'low',
    'low': 'low'
  };

  // Helper to extract owner identifier from imported row
  const extractRawOwner = (row) => {
    return String(
      row['שיוך למשתמש'] || 
      row['שיוך משתמש'] || 
      row['שם בעל החשבון'] || 
      row['בעל החשבון'] || 
      row['בעל חשבון'] || 
      row['OwnerID'] || 
      row['ownerId'] || 
      row['owner'] || 
      row['user'] || 
      row['userId'] || 
      'משתמש ראשי'
    ).trim() || 'משתמש ראשי';
  };

  /**
   * Generates and downloads Excel (.xlsx) file.
   * If isTemplate === true:
   *  - Contains ONLY the current active month (e.g. "09/2026").
   *  - Zero data rows (empty header-only sheets) so it is 100% clean and private.
   * If isTemplate === false:
   *  - Comprehensive human-readable backup of all system modules.
   */
  const handleExportXLSX = (isTemplate = false) => {
    try {
      const wb = XLSX.utils.book_new();

      // Determine active month
      const now = new Date();
      const currentCalMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const activeCurrentMonth = selectedMonth || (monthsList && monthsList.length > 0 ? monthsList[monthsList.length - 1] : currentCalMonth);

      // In template mode: ONLY the single current month!
      // In backup mode: all tracked months.
      const exportMonths = isTemplate ? [activeCurrentMonth] : ((monthsList && monthsList.length > 0) ? monthsList : [activeCurrentMonth]);

      const defaultOwner = users[0] || { uid: 'u1', displayName: 'משתמש ראשי' };
      const defaultOwnerName = defaultOwner.displayName || defaultOwner.name || 'משתמש ראשי';
      const defaultOwnerUid = defaultOwner.uid || defaultOwner.id || 'u1';

      // 1. Sheet 1: "הון וחשבונות" (Accounts & Balances)
      let accountsExport = [];
      const hasRealAccounts = accounts && accounts.length > 0 && !isTemplate;

      if (hasRealAccounts) {
        accountsExport = accounts.map((a, idx) => {
          const ownerMember = users.find(u => (u.uid || u.id) === a.ownerId);
          const ownerName = ownerMember ? (ownerMember.displayName || ownerMember.name) : defaultOwnerName;
          
          const flaggedList = a.flaggedMonths 
            ? Object.entries(a.flaggedMonths).filter(([_, v]) => Boolean(v)).map(([m]) => m).join(', ')
            : '';

          const row = {
            'מזהה חשבון': a.id || `acc_${idx}`,
            'סדר': a.order !== undefined ? a.order : idx,
            'שם החשבון': a.name,
            'סוג החשבון': catToHeb[a.category] || a.category,
            'מטבע': normalizeCurrencyCode(a.currency),
            'שיוך למשתמש': a.ownerId || defaultOwnerUid,
            'שם בעל החשבון': ownerName,
            'חודשים מסומנים בדגל': flaggedList || 'ללא'
          };
          exportMonths.forEach(m => {
            row[m] = a.balances && a.balances[m] !== undefined ? a.balances[m] : 0;
          });
          return row;
        });
      }

      const accountHeaders = isTemplate
        ? ['סדר', 'שם החשבון', 'סוג החשבון', 'מטבע', 'בעל החשבון', 'מסומן בדגל', ...exportMonths]
        : ['מזהה חשבון', 'סדר', 'שם החשבון', 'סוג החשבון', 'מטבע', 'שיוך למשתמש', 'שם בעל החשבון', 'חודשים מסומנים בדגל', ...exportMonths];

      let wsAccounts;
      if (accountsExport.length > 0) {
        wsAccounts = XLSX.utils.json_to_sheet(accountsExport, { header: accountHeaders });
      } else {
        wsAccounts = XLSX.utils.aoa_to_sheet([accountHeaders]);
      }

      wsAccounts['!cols'] = isTemplate
        ? [
            { wch: 8 },  // סדר
            { wch: 30 }, // שם החשבון
            { wch: 18 }, // סוג החשבון
            { wch: 10 }, // מטבע
            { wch: 20 }, // בעל החשבון
            { wch: 16 }, // מסומן בדגל
            ...exportMonths.map(() => ({ wch: 14 })) // חודש נוכחי
          ]
        : [
            { wch: 18 }, // מזהה חשבון
            { wch: 8 },  // סדר
            { wch: 30 }, // שם החשבון
            { wch: 16 }, // סוג החשבון
            { wch: 10 }, // מטבע
            { wch: 22 }, // שיוך למשתמש
            { wch: 20 }, // שם בעל החשבון
            { wch: 22 }, // חודשים מסומנים בדגל
            ...exportMonths.map(() => ({ wch: 14 })) // חודשים
          ];
      XLSX.utils.book_append_sheet(wb, wsAccounts, "הון וחשבונות");

      // 2. Sheet 2: "תקציב חודשי" (Monthly Budget)
      let budgetExport = [];
      const hasRealBudget = budget && (
        (budget.incomes && budget.incomes.length > 0) ||
        (budget.fixedExpenses && budget.fixedExpenses.length > 0) ||
        (budget.variableExpenses && budget.variableExpenses.length > 0) ||
        (budget.savings && budget.savings.length > 0)
      ) && !isTemplate;

      if (hasRealBudget) {
        ['incomes', 'fixedExpenses', 'variableExpenses', 'savings'].forEach(cat => {
          (budget[cat] || []).forEach(item => {
            budgetExport.push({
              'מזהה סעיף': item.id || '',
              'קטגוריה': budgetToHeb[cat] || cat,
              'שם הסעיף': item.name,
              'סכום (₪)': item.amount || 0
            });
          });
        });
      }

      const budgetHeaders = isTemplate 
        ? ['קטגוריה', 'שם הסעיף', 'סכום (₪)']
        : ['מזהה סעיף', 'קטגוריה', 'שם הסעיף', 'סכום (₪)'];

      let wsBudget;
      if (budgetExport.length > 0) {
        wsBudget = XLSX.utils.json_to_sheet(budgetExport, { header: budgetHeaders });
      } else {
        wsBudget = XLSX.utils.aoa_to_sheet([budgetHeaders]);
      }

      wsBudget['!cols'] = isTemplate
        ? [{ wch: 22 }, { wch: 35 }, { wch: 16 }]
        : [{ wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsBudget, "תקציב חודשי");

      // 3. Sheet 3: "מחשבונים פיננסיים" (Financial Calculators)
      let calcsExport = [];
      const calcsHeaders = [
        'מודול', 
        'שיוך משתמש', 
        'שם שדה / מסלול', 
        'ערך', 
        'ריבית (%)', 
        'תקופה (שנים)', 
        'לוח סילוקין', 
        'הערות'
      ];

      if (!isTemplate) {
        const currentCalcs = calculatorsData || DEFAULT_CALCULATORS_DATA;
        const mortgage = currentCalcs.mortgage || {};
        const fire = currentCalcs.fire || {};
        const pension = currentCalcs.pension || {};

        // Mortgage general parameters
        calcsExport.push({ 'מודול': 'משכנתא והלוואות', 'שיוך משתמש': 'כללי', 'שם שדה / מסלול': 'שווי נכס', 'ערך': mortgage.propertyValue || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'שווי הנכס בשקלים' });
        calcsExport.push({ 'מודול': 'משכנתא והלוואות', 'שיוך משתמש': 'כללי', 'שם שדה / מסלול': 'הכנסה חודשית נטו', 'ערך': mortgage.monthlyIncome || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'הכנסה חודשית משפחתית בשקלים' });
        calcsExport.push({ 'מודול': 'משכנתא והלוואות', 'שיוך משתמש': 'כללי', 'שם שדה / מסלול': 'מדד המחירים לצרכן (אינפלציה צפויה %)', 'ערך': mortgage.expectedInflation || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'אינפלציה שנתית צפויה' });
        calcsExport.push({ 'מודול': 'משכנתא והלוואות', 'שיוך משתמש': 'כללי', 'שם שדה / מסלול': 'מדד תשומות הבנייה (%)', 'ערך': mortgage.constructionInflation || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'מדד בנייה צפוי' });

        // Mortgage tracks (Clean tabular format - no ugly JSON dump!)
        (mortgage.tracks || []).forEach(track => {
          calcsExport.push({
            'מודול': 'מסלול הלוואה / משכנתא',
            'שיוך משתמש': 'כללי',
            'שם שדה / מסלול': track.name || 'מסלול',
            'ערך': track.amount || 0,
            'ריבית (%)': track.interest !== undefined ? track.interest : 5.0,
            'תקופה (שנים)': track.years || 25,
            'לוח סילוקין': track.scheduleType === 'equal_principal' ? 'קרן שווה' : 'שפיצר',
            'הערות': track.isLinked ? 'צמוד מדד' : 'לא צמוד'
          });
        });

        // FIRE calculator params across all users
        const fireUserKeys = Object.keys(fire);
        const usersToExportFire = fireUserKeys.length > 0 ? fireUserKeys : [defaultOwnerUid];

        usersToExportFire.forEach(uKey => {
          const fData = fire[uKey] || {};
          const uMember = users.find(u => (u.uid || u.id) === uKey);
          const uLabel = uMember ? `${uMember.displayName || uMember.name} (${uKey})` : uKey;

          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'הון התחלתי (₪)', 'ערך': fData.initialCapital || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'הפקדה חודשית (₪)', 'ערך': fData.monthlyDeposit || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'משיכה חודשית רצויה נטו (₪)', 'ערך': fData.desiredNetMonthlyWithdrawal || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'תשואה שנתית בצבירה (%)', 'ערך': fData.accumulationReturn || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'תשואה שנתית בפרישה (%)', 'ערך': fData.retirementReturn || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'מס רווחי הון (%)', 'ערך': fData.capitalGainsTax || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'אינפלציה שנתית (%)', 'ערך': fData.annualInflation || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'גיל נוכחי', 'ערך': fData.currentAge || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'שנים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'דמי ניהול שנתיים מתיק (%)', 'ערך': fData.annualManagementFee || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'גידול שנתי בהפקדות (%)', 'ערך': fData.annualDepositGrowth || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'סכום חד פעמי עתידי (₪)', 'ערך': fData.lumpSumAmount || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'עצמאות כלכלית (FIRE)', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'שנים עד לקבלת סכום חד פעמי', 'ערך': fData.lumpSumYears || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'שנים' });
        });

        // Pension simulator params across all users
        const pensionUserKeys = Object.keys(pension);
        const usersToExportPension = pensionUserKeys.length > 0 ? pensionUserKeys : [defaultOwnerUid];

        usersToExportPension.forEach(uKey => {
          const pData = pension[uKey] || {};
          const uMember = users.find(u => (u.uid || u.id) === uKey);
          const uLabel = uMember ? `${uMember.displayName || uMember.name} (${uKey})` : uKey;

          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'צבירה נוכחית (₪)', 'ערך': pData.balance || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'הפקדה חודשית (₪)', 'ערך': pData.monthlyDeposit || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'גיל נוכחי', 'ערך': pData.currentAge || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'שנים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'גיל פרישה', 'ערך': pData.retireAge || pData.retirementAge || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'שנים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'משכורת חודשית (₪)', 'ערך': pData.salary || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'בשקלים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'מסלול השקעה', 'ערך': pData.trackId || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'קוד מסלול' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'תשואה שנתית צפויה (%)', 'ערך': pData.customReturnRate || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'דמי ניהול מהפקדה (%)', 'ערך': pData.managementFeeDeposit || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'דמי ניהול מצבירה (%)', 'ערך': pData.managementFeeBalance || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'אינפלציה שנתית (%)', 'ערך': pData.annualInflationRate || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'גידול שנתי בהפקדות (%)', 'ערך': pData.annualDepositGrowth || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'באחוזים' });
          calcsExport.push({ 'מודול': 'סימולטור פנסיוני', 'שיוך משתמש': uLabel, 'שם שדה / מסלול': 'מקדם קצבה', 'ערך': pData.annuityFactor || '', 'ריבית (%)': '', 'תקופה (שנים)': '', 'לוח סילוקין': '', 'הערות': 'מקדם המרה לקצבה' });
        });
      }

      let wsCalcs;
      if (calcsExport.length > 0) {
        wsCalcs = XLSX.utils.json_to_sheet(calcsExport, { header: calcsHeaders });
      } else {
        wsCalcs = XLSX.utils.aoa_to_sheet([calcsHeaders]);
      }

      wsCalcs['!cols'] = [
        { wch: 24 }, // מודול
        { wch: 22 }, // שיוך משתמש
        { wch: 35 }, // שם שדה
        { wch: 18 }, // ערך
        { wch: 14 }, // ריבית
        { wch: 15 }, // תקופה
        { wch: 16 }, // לוח סילוקין
        { wch: 35 }  // הערות
      ];
      XLSX.utils.book_append_sheet(wb, wsCalcs, "מחשבונים פיננסיים");

      // 4. Sheet 4: "משימות פיננסיות" (Financial Tasks)
      let tasksExport = [];
      const tasksHeaders = isTemplate
        ? ['כותרת המשימה', 'תיאור המשימה', 'עדיפות', 'סטטוס', 'תאריך יעד', 'שיוך למשתמש']
        : ['מזהה ייחודי', 'כותרת המשימה', 'תיאור המשימה', 'עדיפות', 'סטטוס', 'תאריך יעד', 'שויך אל', 'נוצר בתאריך', 'הושלם בתאריך'];

      if (tasks && tasks.length > 0 && !isTemplate) {
        tasksExport = tasks.map(t => ({
          'מזהה ייחודי': t.id || '',
          'כותרת המשימה': t.title,
          'תיאור המשימה': t.description || '',
          'עדיפות': priorityToHeb[t.priority] || t.priority || 'בינונית',
          'סטטוס': t.completed ? 'הושלם' : 'לביצוע',
          'תאריך יעד': t.targetDate || '',
          'שויך אל': t.assignedTo || '',
          'נוצר בתאריך': t.createdAt || '',
          'הושלם בתאריך': t.completedAt || ''
        }));
      }

      let wsTasks;
      if (tasksExport.length > 0) {
        wsTasks = XLSX.utils.json_to_sheet(tasksExport, { header: tasksHeaders });
      } else {
        wsTasks = XLSX.utils.aoa_to_sheet([tasksHeaders]);
      }

      wsTasks['!cols'] = isTemplate
        ? [
            { wch: 32 }, // כותרת המשימה
            { wch: 45 }, // תיאור המשימה
            { wch: 14 }, // עדיפות
            { wch: 14 }, // סטטוס
            { wch: 16 }, // תאריך יעד
            { wch: 20 }  // שיוך למשתמש
          ]
        : [
            { wch: 18 }, // מזהה ייחודי
            { wch: 32 }, // כותרת המשימה
            { wch: 40 }, // תיאור המשימה
            { wch: 14 }, // עדיפות
            { wch: 14 }, // סטטוס
            { wch: 16 }, // תאריך יעד
            { wch: 18 }, // שויך אל
            { wch: 20 }, // נוצר בתאריך
            { wch: 20 }  // הושלם בתאריך
          ];
      XLSX.utils.book_append_sheet(wb, wsTasks, "משימות פיננסיות");

      // 5. Sheet 5: "מדריך והנחיות" (Guide & Instructions)
      const guideExport = [
        {
          'שם הלשונית': 'הון וחשבונות',
          'מטרת הלשונית': 'ניהול יתרות הנכסים וההתחייבויות בחלוקה לחודשים',
          'ערכים מותרים': 'סוג חשבון: טווח קצר, טווח בינוני, טווח ארוך, התחייבויות. עמודת חודש: MM/YYYY (כגון ' + activeCurrentMonth + ').',
          'הנחיות למילוי': 'הזינו שורה לכל חשבון. סכומים מוזנים כמספרים חיוביים (המערכת מחשבת התחייבויות בהתאם לסוג).'
        },
        {
          'שם הלשונית': 'תקציב חודשי',
          'מטרת הלשונית': 'מעקב שוטף אחר הכנסות, הוצאות קבועות, הוצאות משתנות וחסכונות',
          'ערכים מותרים': 'קטגוריה: הכנסה, הוצאה קבועה, הוצאה משתנה, חיסכון והשקעה.',
          'הנחיות למילוי': 'הזינו שם סעיף וסכום חודשי ממוצע בשקלים.'
        },
        {
          'שם הלשונית': 'מחשבונים פיננסיים',
          'מטרת הלשונית': 'שמירת הנחות עבודה של מחשבוני משכנתא, FIRE ופנסיה',
          'ערכים מותרים': 'אחוזים, סכומים בשקלים, שפיצר / קרן שווה.',
          'הנחיות למילוי': 'בייבוא, המערכת קוראת את הפרמטרים ומשחזרת את המחשבונים במדויק.'
        },
        {
          'שם הלשונית': 'משימות פיננסיות',
          'מטרת הלשונית': 'רשימת פעולות אישיות לביצוע לתכנון כלכלי',
          'ערכים מותרים': 'עדיפות: גבוהה / בינונית / נמוכה. סטטוס: הושלם / לביצוע.',
          'הנחיות למילוי': 'הזינו כותרת משימה, תאריך יעד רצוי ושיוך משתמש.'
        }
      ];

      const wsGuide = XLSX.utils.json_to_sheet(guideExport);
      wsGuide['!cols'] = [
        { wch: 20 },
        { wch: 35 },
        { wch: 45 },
        { wch: 50 }
      ];
      XLSX.utils.book_append_sheet(wb, wsGuide, "מדריך והנחיות");

      // Right-to-Left orientation for Hebrew Excel
      wb.Workbook = {
        Views: [{ RTL: true }]
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeRoomName = (roomName || currentRoom?.name) ? `${(roomName || currentRoom?.name).replace(/[^\w\u0590-\u05FF]/g, '_')}_` : '';
      const fileName = isTemplate 
        ? `Financial_Tracker_Template_${dateStr}.xlsx` 
        : `Financial_Backup_${safeRoomName}${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setStatusType('success');
      setStatusMsg(isTemplate ? 'תבנית נקייה למילוי (לחודש הנוכחי בלבד) הורדה בהצלחה!' : 'קובץ הגיבוי המלא ב-Excel יוצא בהצלחה!');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setStatusType('error');
      setStatusMsg('שגיאה ביצירת קובץ ה-Excel.');
    }
  };

  /**
   * Handles incoming file selection (Excel / CSV or legacy JSON).
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatusType('info');
    setStatusMsg('קורא ומנתח את הקובץ...');
    const isJson = file.name.endsWith('.json') || file.type === 'application/json';

    const reader = new FileReader();
    if (isJson) {
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          processRawImportData({
            rawAccounts: parsed.accounts || [],
            rawBudget: parsed.budget || null,
            explicitMonths: parsed.monthsList || [],
            rawCalculators: parsed.calculators || parsed.calculatorsData || null,
            rawTasks: parsed.tasks || null,
            rawViewState: parsed.viewState || null
          });
        } catch (err) {
          console.error(err);
          setStatusType('error');
          setStatusMsg('שגיאה בפענוח קובץ ה-JSON. ודא שהמבנה תקין.');
        }
      };
      reader.readAsText(file);
    } else {
      // Excel (.xlsx, .xls) or CSV
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // Find sheets by name
          const accountsSheetName = workbook.SheetNames.find(n => 
            n === 'הון וחשבונות' || n === 'הון' || n === 'חשבונות' || n.toLowerCase().includes('account')
          );
          const budgetSheetName = workbook.SheetNames.find(n => 
            n === 'תקציב חודשי' || n === 'תקציב' || n.toLowerCase().includes('budget')
          );
          const calcsSheetName = workbook.SheetNames.find(n => 
            n === 'מחשבונים פיננסיים' || n === 'מחשבונים' || n.toLowerCase().includes('calc')
          );
          const tasksSheetName = workbook.SheetNames.find(n => 
            n === 'משימות פיננסיות' || n === 'משימות' || n.toLowerCase().includes('task')
          );

          let accData = [];
          let budData = [];
          let calcsDataRaw = null;
          let tasksDataRaw = null;

          if (accountsSheetName) {
            accData = XLSX.utils.sheet_to_json(workbook.Sheets[accountsSheetName]);
          } else if (workbook.SheetNames.length > 0) {
            accData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          }

          if (budgetSheetName) {
            budData = XLSX.utils.sheet_to_json(workbook.Sheets[budgetSheetName]);
          }

          if (calcsSheetName) {
            const parsedCalcsRows = XLSX.utils.sheet_to_json(workbook.Sheets[calcsSheetName]);
            calcsDataRaw = parseCalculatorsFromExcelRows(parsedCalcsRows);
          }

          if (tasksSheetName) {
            const parsedTaskRows = XLSX.utils.sheet_to_json(workbook.Sheets[tasksSheetName]);
            tasksDataRaw = parseTasksFromExcelRows(parsedTaskRows);
          }

          processRawImportData({
            rawAccounts: accData,
            rawBudget: budData,
            explicitMonths: null,
            rawCalculators: calcsDataRaw,
            rawTasks: tasksDataRaw,
            rawViewState: null
          });
        } catch (err) {
          console.error(err);
          setStatusType('error');
          setStatusMsg('שגיאה בקריאת הקובץ. ודא שהקובץ תקין ובפורמט Excel נתמך.');
        }
      };
      reader.readAsBinaryString(file);
    }

    e.target.value = '';
  };

  /**
   * Parses calculators sheet from Excel into calculatorsData structure
   */
  const parseCalculatorsFromExcelRows = (rows) => {
    if (!rows || !rows.length) return null;
    const result = {
      mortgage: { propertyValue: '', monthlyIncome: '', expectedInflation: '', constructionInflation: '', tracks: [] },
      fire: {},
      pension: {}
    };

    rows.forEach(row => {
      const mod = String(row['מודול'] || '').trim();
      const userKeyRaw = String(row['שיוך משתמש'] || row['משתמש'] || '').trim();
      const field = String(row['שם שדה / מסלול'] || row['שדה'] || '').trim();
      const val = row['ערך'];
      const notes = String(row['הערות'] || '');

      // Resolve user key
      let uKey = 'default';
      const uidMatch = userKeyRaw.match(/\(([^)]+)\)$/);
      if (uidMatch) {
        uKey = uidMatch[1];
      } else if (userKeyRaw && userKeyRaw !== 'כללי') {
        uKey = userKeyRaw;
      }

      if (mod.includes('משכנתא') || mod.includes('הלווא')) {
        if (field.includes('שווי נכס')) result.mortgage.propertyValue = String(val || '');
        else if (field.includes('הכנסה')) result.mortgage.monthlyIncome = String(val || '');
        else if (field.includes('אינפלציה') || field.includes('צרכן')) result.mortgage.expectedInflation = String(val || '');
        else if (field.includes('מדד תשומות') || field.includes('בנייה')) result.mortgage.constructionInflation = String(val || '');
        else if (mod.includes('מסלול')) {
          // If notes contain JSON, try parsing (backward compatibility)
          let parsedTrack = null;
          try {
            parsedTrack = JSON.parse(notes);
          } catch {
            // Not JSON, parse clean columns
          }

          if (parsedTrack && typeof parsedTrack === 'object') {
            result.mortgage.tracks.push(parsedTrack);
          } else {
            const interest = parseFloat(row['ריבית (%)']) || 5.0;
            const years = parseInt(row['תקופה (שנים)']) || 25;
            const scheduleRaw = String(row['לוח סילוקין'] || '').trim();
            const scheduleType = scheduleRaw.includes('קרן שווה') ? 'equal_principal' : 'spitzer';
            const isLinked = notes.includes('צמוד מדד') || notes.includes('צמוד') || notes === 'true';

            result.mortgage.tracks.push({
              id: 'track_' + Date.now() + Math.random().toString(36).substr(2, 6),
              name: field,
              amount: parseFloat(val) || 0,
              interest,
              years,
              scheduleType,
              isLinked
            });
          }
        }
      } else if (mod.includes('עצמאות כלכלית') || mod.includes('FIRE')) {
        if (!result.fire[uKey]) result.fire[uKey] = {};
        const f = result.fire[uKey];

        if (field.includes('הון התחלתי')) f.initialCapital = String(val || '');
        else if (field.includes('הפקדה חודשית')) f.monthlyDeposit = String(val || '');
        else if (field.includes('משיכה')) f.desiredNetMonthlyWithdrawal = String(val || '');
        else if (field.includes('תשואה שנתית בצבירה')) f.accumulationReturn = String(val || '');
        else if (field.includes('תשואה שנתית בפרישה')) f.retirementReturn = String(val || '');
        else if (field.includes('מס רווחי הון')) f.capitalGainsTax = String(val || '');
        else if (field.includes('אינפלציה')) f.annualInflation = String(val || '');
        else if (field.includes('גיל')) f.currentAge = String(val || '');
        else if (field.includes('דמי ניהול')) f.annualManagementFee = String(val || '');
        else if (field.includes('גידול')) f.annualDepositGrowth = String(val || '');
        else if (field.includes('חד פעמי')) f.lumpSumAmount = String(val || '');
        else if (field.includes('שנים עד')) f.lumpSumYears = String(val || '');
      } else if (mod.includes('פנסיוני') || mod.includes('פנסיה')) {
        if (!result.pension[uKey]) result.pension[uKey] = {};
        const p = result.pension[uKey];

        if (field.includes('הגדרות פנסיה מלאות') || field.includes('JSON')) {
          try {
            const fullP = JSON.parse(val || notes);
            Object.assign(p, fullP);
          } catch {
            // ignore
          }
        } else {
          if (field.includes('צבירה נוכחית')) p.balance = String(val || '');
          else if (field.includes('הפקדה חודשית')) p.monthlyDeposit = String(val || '');
          else if (field.includes('גיל נוכחי')) p.currentAge = String(val || '');
          else if (field.includes('גיל פרישה')) { p.retireAge = String(val || ''); p.retirementAge = String(val || ''); }
          else if (field.includes('משכורת')) p.salary = String(val || '');
          else if (field.includes('מסלול')) p.trackId = String(val || '');
          else if (field.includes('תשואה')) p.customReturnRate = String(val || '');
          else if (field.includes('דמי ניהול מהפקדה')) p.managementFeeDeposit = String(val || '');
          else if (field.includes('דמי ניהול מצבירה')) p.managementFeeBalance = String(val || '');
          else if (field.includes('אינפלציה')) p.annualInflationRate = String(val || '');
          else if (field.includes('גידול')) p.annualDepositGrowth = String(val || '');
          else if (field.includes('מקדם')) p.annuityFactor = String(val || '');
        }
      }
    });

    return result;
  };

  /**
   * Parses tasks sheet from Excel into task objects
   */
  const parseTasksFromExcelRows = (rows) => {
    if (!rows || !rows.length) return null;
    return rows.map((r, idx) => {
      const statusRaw = String(r['סטטוס'] || '').trim();
      const isCompleted = statusRaw === 'הושלם' || statusRaw === 'כן' || statusRaw === 'true';
      const priorityRaw = String(r['עדיפות'] || '').trim();
      const priority = hebToPriority[priorityRaw] || 'medium';

      return {
        id: r['מזהה ייחודי'] || r['מזהה'] || ('task_imp_' + Date.now() + '_' + idx),
        title: r['כותרת המשימה'] || r['כותרת'] || 'משימה מיובאת',
        description: r['תיאור המשימה'] || r['תיאור'] || '',
        priority,
        completed: isCompleted,
        targetDate: r['תאריך יעד'] || '',
        assignedTo: r['שויך אל'] || r['שיוך למשתמש'] || r['שיוך'] || '',
        createdAt: r['נוצר בתאריך'] || new Date().toISOString(),
        completedAt: r['הושלם בתאריך'] || (isCompleted ? new Date().toISOString() : undefined)
      };
    });
  };

  /**
   * Step 1: Detect Owners & Prepare Smart Multi-User Mapping Modal
   */
  const processRawImportData = ({ rawAccounts, rawBudget, explicitMonths, rawCalculators, rawTasks, rawViewState }) => {
    let newMonths = explicitMonths || [];
    if (!newMonths.length && rawAccounts.length) {
      const monthSet = new Set();
      rawAccounts.forEach(row => {
        Object.keys(row).forEach(k => {
          if (/^\d{2}\/\d{4}$/.test(k)) monthSet.add(k);
        });
      });
      newMonths = sortMonths(Array.from(monthSet));
    }

    // Detect distinct owners in the accounts
    const ownerCounts = {};
    rawAccounts.forEach(row => {
      const rawOwner = extractRawOwner(row);
      ownerCounts[rawOwner] = (ownerCounts[rawOwner] || 0) + 1;
    });

    const distinctOwners = Object.keys(ownerCounts);

    // Smart Multi-User Mapping Guess
    const initialMapping = {};
    const usedMemberUids = new Set();

    // Pass A: Exact or pattern match
    distinctOwners.forEach((rawOwner) => {
      const rLower = rawOwner.toLowerCase();
      
      let foundMember = users.find(u => {
        const uUid = (u.uid || u.id || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uName = (u.displayName || u.name || '').toLowerCase();
        if (uUid && uUid === rLower) return true;
        if (uEmail && uEmail === rLower) return true;
        if (uName && (uName === rLower || (uName.length > 2 && rLower.includes(uName)) || (rLower.length > 2 && uName.includes(rLower)))) return true;
        return false;
      });

      if (!foundMember && (
        rLower === 'u1' || rLower === 'user1' || rLower === '1' || 
        rLower.includes('ראשי') || rLower.includes('אדמין') || rLower.includes('admin') || rLower.includes('owner')
      )) {
        foundMember = users[0];
      }

      if (!foundMember && (
        rLower === 'u2' || rLower === 'user2' || rLower === '2' || 
        rLower.includes('משני') || rLower.includes('בן זוג') || rLower.includes('בת זוג') || rLower.includes('partner') || rLower.includes('member')
      )) {
        foundMember = users[1] || users[0];
      }

      if (foundMember) {
        const targetUid = foundMember.uid || foundMember.id;
        initialMapping[rawOwner] = targetUid;
        usedMemberUids.add(targetUid);
      }
    });

    // Pass B: Distribute remaining unmapped owners to available members
    distinctOwners.forEach((rawOwner, idx) => {
      if (!initialMapping[rawOwner]) {
        const unusedMember = users.find(u => !usedMemberUids.has(u.uid || u.id));
        if (unusedMember) {
          const targetUid = unusedMember.uid || unusedMember.id;
          initialMapping[rawOwner] = targetUid;
          usedMemberUids.add(targetUid);
        } else {
          const fallbackUser = users[idx] || users[0];
          initialMapping[rawOwner] = fallbackUser ? (fallbackUser.uid || fallbackUser.id) : '';
        }
      }
    });

    setPendingImportData({
      rawAccounts,
      rawBudget,
      newMonths,
      rawCalculators,
      rawTasks,
      rawViewState,
      ownerCounts,
      distinctOwners
    });
    setUserMapping(initialMapping);

    if (distinctOwners.length > 0) {
      setShowMappingModal(true);
      setStatusMsg('');
    } else {
      executeImport({
        rawAccounts,
        rawBudget,
        newMonths,
        rawCalculators,
        rawTasks,
        rawViewState,
        resolvedUserMapping: {}
      });
    }
  };

  /**
   * Step 2: Confirm Mapping & Sync to Cloud & State
   */
  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    setIsProcessingImport(true);
    await executeImport({
      ...pendingImportData,
      resolvedUserMapping: userMapping
    });
    setIsProcessingImport(false);
    setShowMappingModal(false);
    setPendingImportData(null);
  };

  /**
   * Core Import Execution Function - Complete and Lossless Round-Trip
   */
  const executeImport = async ({
    rawAccounts,
    rawBudget,
    newMonths,
    rawCalculators,
    rawTasks,
    rawViewState,
    resolvedUserMapping
  }) => {
    try {
      const validUids = new Set(users.map(u => u.uid || u.id));
      const defaultAdminUid = users[0]?.uid || users[0]?.id || (authUser?.uid || 'u1');

      // 1. Transform Accounts (preserve exact IDs, orders, balances, flaggedMonths)
      const newAccounts = (rawAccounts || []).map((row, idx) => {
        const rawOwner = extractRawOwner(row);
        let resolvedUid = resolvedUserMapping[rawOwner];

        if (!resolvedUid || !validUids.has(resolvedUid)) {
          resolvedUid = defaultAdminUid;
        }

        const balances = {};
        if (newMonths && newMonths.length > 0) {
          newMonths.forEach(m => {
            balances[m] = parseFloat(row[m]) || 0;
          });
        } else if (row.balances) {
          Object.assign(balances, row.balances);
        }

        const explicitOrder = row['סדר'] !== undefined ? Number(row['סדר']) : (row.order !== undefined ? Number(row.order) : idx);

        // Flagged months restoration
        let flaggedMonths = {};
        if (row.flaggedMonths && typeof row.flaggedMonths === 'object') {
          flaggedMonths = row.flaggedMonths;
        } else if (row['חודשים מסומנים בדגל'] && row['חודשים מסומנים בדגל'] !== 'ללא') {
          const monthsParsed = String(row['חודשים מסומנים בדגל']).split(',').map(s => s.trim());
          monthsParsed.forEach(m => {
            if (m) flaggedMonths[m] = true;
          });
        } else if (row['מסומן בדגל'] === 'כן' || row['מסומן בדגל'] === 'true' || row.isFlagged === true) {
          const targetM = (newMonths && newMonths.length > 0) ? newMonths[newMonths.length - 1] : (selectedMonth || '08/2026');
          flaggedMonths[targetM] = true;
        }

        const originalId = row['מזהה חשבון'] || row.id;

        return {
          id: originalId || ('acc_' + Date.now() + Math.random().toString(36).substr(2, 9)),
          name: row['שם החשבון'] || row['Name'] || row.name || 'חשבון מיובא',
          category: hebToCat[row['סוג החשבון']] || row['סוג החשבון'] || row.category || 'short',
          currency: normalizeCurrencyCode(row['מטבע'] || row['Currency'] || row.currency),
          ownerId: resolvedUid,
          order: isNaN(explicitOrder) ? idx : explicitOrder,
          balances,
          flaggedMonths
        };
      });

      // 2. Transform Budget (preserve item IDs, categories, amounts)
      let formattedBudget = null;
      let budgetItemsCount = 0;
      if (rawBudget) {
        if (Array.isArray(rawBudget)) {
          formattedBudget = { incomes: [], fixedExpenses: [], variableExpenses: [], savings: [] };
          rawBudget.forEach(row => {
            const bCat = hebToBudget[row['קטגוריה']] || hebToBudget[row['סוג החשבון']] || row['קטגוריה'] || row['סוג החשבון'];
            if (bCat && formattedBudget[bCat]) {
              formattedBudget[bCat].push({
                id: row['מזהה סעיף'] || row.id || ('item_' + Date.now() + Math.random().toString(36).substr(2, 9)),
                name: row['שם הסעיף'] || row['שם החשבון'] || row['Name'] || row.name || 'סעיף תקציב',
                amount: parseFloat(row['סכום (₪)'] || row['סכום'] || row['Amount'] || row.amount) || 0
              });
              budgetItemsCount++;
            }
          });
        } else if (typeof rawBudget === 'object') {
          formattedBudget = rawBudget;
          budgetItemsCount = Object.values(rawBudget).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
        }
      }

      // 3. Transform Calculators
      let finalCalculators = rawCalculators || null;

      // 4. Transform Tasks
      let finalTasks = rawTasks || null;
      if (finalTasks && Array.isArray(finalTasks)) {
        finalTasks = finalTasks.map((t, idx) => ({
          id: t.id || t['מזהה ייחודי'] || t['מזהה'] || ('task_imp_' + Date.now() + '_' + idx),
          title: t.title || t['כותרת המשימה'] || 'משימה',
          description: t.description || t['תיאור המשימה'] || '',
          priority: t.priority || 'medium',
          completed: Boolean(t.completed),
          completedAt: t.completedAt || (t.completed ? new Date().toISOString() : undefined),
          assignedTo: t.assignedTo || t['שויך אל'] || t['שיוך למשתמש'] || '',
          targetDate: t.targetDate || t['תאריך יעד'] || '',
          createdAt: t.createdAt || t['נוצר בתאריך'] || new Date().toISOString()
        }));
      }

      // 5. Update local React States
      if (setAccounts && newAccounts.length > 0) {
        setAccounts(newAccounts);
      }
      if (newMonths && newMonths.length > 0 && setMonthsList) {
        setMonthsList(newMonths);
      }
      if (formattedBudget && setBudget) {
        setBudget(formattedBudget);
      }
      if (finalCalculators && setCalculatorsData) {
        setCalculatorsData(finalCalculators);
      }
      if (finalTasks && setTasks) {
        setTasks(finalTasks);
      }
      if (rawViewState?.selectedMonth && setSelectedMonth) {
        setSelectedMonth(rawViewState.selectedMonth);
      }
      if (setSelectedPersonalUserId && authUser) {
        setSelectedPersonalUserId(authUser.uid);
      }

      // 6. Transparent Cloud Sync
      const syncPromises = [];

      if (newMonths && newMonths.length > 0 && syncMonthsToCloud) {
        syncPromises.push(syncMonthsToCloud(newMonths));
      }

      if (newAccounts.length > 0 && syncAccountToCloud) {
        if (deleteAccountFromCloud && accounts.length > 0) {
          syncPromises.push(...accounts.map(acc => deleteAccountFromCloud(acc.id)));
        }
        syncPromises.push(...newAccounts.map(acc => syncAccountToCloud(acc)));
      }

      if (formattedBudget && syncBudgetToCloud) {
        syncPromises.push(syncBudgetToCloud(formattedBudget));
      }

      if (finalCalculators && syncCalculatorsToCloud) {
        syncPromises.push(syncCalculatorsToCloud(finalCalculators));
      }

      if (finalTasks && syncTasksToCloud) {
        syncPromises.push(syncTasksToCloud(finalTasks));
      }

      await Promise.all(syncPromises);

      // 7. Friendly Success Notice
      const parts = [];
      if (newAccounts.length > 0) parts.push(`${newAccounts.length} חשבונות`);
      if (budgetItemsCount > 0) parts.push(`${budgetItemsCount} סעיפי תקציב`);
      if (finalCalculators) parts.push('מחשבונים פיננסיים');
      if (finalTasks && finalTasks.length > 0) parts.push(`${finalTasks.length} משימות`);

      setStatusType('success');
      setStatusMsg(`השחזור הושלם בהצלחה מלאה! כל הנתונים סונכרנו ישירות לענן: ${parts.join(', ')}.`);
    } catch (err) {
      console.error('Error during import execution:', err);
      setStatusType('error');
      setStatusMsg('שגיאה במהלך ייבוא וסנכרון הנתונים.');
    }
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E8E2D8] dark:border-stone-800 p-6 rounded-2xl space-y-6 shadow-xs max-w-2xl mx-auto font-['Calibri',sans-serif] dir-rtl text-right transition-colors" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">ייצוא, גיבוי וייבוא נתונים</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
          הנתונים שלכם מוצפנים ומסונכרנים בענן בזמן אמת. תוכלו להוריד קובץ גיבוי מלא של המערכת ב-Excel, להוריד תבנית ריקה למילוי עצמי, או לייבא קובץ נתונים לשחזור מלא.
        </p>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold text-center border transition-all ${
          statusType === 'success' 
            ? 'bg-[#E8F5E9] dark:bg-emerald-950/40 text-[#2E7D32] dark:text-emerald-300 border-[#C8E6C9] dark:border-emerald-800' 
            : statusType === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Export Section */}
      <div className="bg-[#FAF7F2] dark:bg-[#252525] p-6 rounded-2xl border border-[#E8E2D8] dark:border-stone-800 space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E8F5E9] dark:bg-emerald-950/60 text-[#2E7D32] dark:text-emerald-300 border border-[#C8E6C9] dark:border-emerald-800 rounded-xl flex items-center justify-center text-xl font-black shrink-0">
            📊
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">ייצוא נתונים מלא</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              הורדת קבצי Excel ברורים ומובנים: גיבוי מלא או תבנית נקייה ללא נתונים
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* 1. Full Excel Export */}
          <button
            onClick={() => handleExportXLSX(false)}
            className="p-4 bg-[#E8F5E9] hover:bg-[#C8E6C9] dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-[#2E7D32] dark:text-emerald-300 border border-[#A5D6A7] dark:border-emerald-700 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
          >
            <span className="text-2xl">📗</span>
            <span className="text-sm font-black">הורד קובץ Excel (.xlsx)</span>
            <span className="text-[11px] font-normal opacity-85">גיבוי נתונים מלא של כל המערכת</span>
          </button>

          {/* 2. Blank Template (Headers Only - Single Current Month) */}
          <button
            onClick={() => handleExportXLSX(true)}
            className="p-4 bg-[#FFF8E1] hover:bg-[#FFECB3] dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-[#F57F17] dark:text-amber-300 border border-[#FFE082] dark:border-amber-700/60 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
          >
            <span className="text-2xl">📋</span>
            <span className="text-sm font-black">הורד תבנית ריקה (Excel)</span>
            <span className="text-[11px] font-normal opacity-85">כותרות בלבד לחודש הנוכחי ללא נתונים אישיים</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-[#FAF7F2] dark:bg-[#252525] p-6 rounded-2xl border border-[#E8E2D8] dark:border-stone-800 space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E3F2FD] dark:bg-sky-950/60 text-[#1976D2] dark:text-sky-300 border border-[#BBDEFB] dark:border-sky-800 rounded-xl flex items-center justify-center text-xl font-black shrink-0">
            📥
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">ייבוא נתונים מקובץ Excel</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              העלו קובץ גיבוי או תבנית שמילאתם. המערכת תשחזר את כל החשבונות, היתרות, התקציב, המחשבונים והמשימות.
            </p>
          </div>
        </div>

        <input 
          type="file" 
          accept=".xlsx, .xls, .csv, .json" 
          onChange={handleFileSelect} 
          className="hidden" 
          id="data-file-upload" 
        />
        <label 
          htmlFor="data-file-upload" 
          className="block w-full py-6 px-4 text-center bg-[#FFFFFF] hover:bg-[#F2ECE1] dark:bg-[#1E1E1E] dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 border-2 border-dashed border-[#DDD6CA] dark:border-stone-700 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer space-y-1.5"
        >
          <div className="text-3xl">📁</div>
          <div className="text-stone-900 dark:text-stone-100 font-black text-sm">לחצו כאן לבחירת קובץ Excel (.xlsx) לייבוא</div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 font-normal">תמיכה מלאה בכל קבצי הגיבוי והתבניות</div>
        </label>
      </div>

      {/* User Mapping Modal (Step 2 of Import) */}
      {showMappingModal && pendingImportData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-[#E8E2D8] dark:border-stone-800 max-w-lg w-full p-6 space-y-5 text-right font-['Calibri',sans-serif]" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">שלב מיפוי משתמשים לייבוא</h3>
                  <span className="text-xs text-stone-500 dark:text-stone-400">התאמת בעלי חשבונות מהקובץ לחברי החדר הנוכחי</span>
                </div>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FAF7F2] dark:bg-[#252525] p-3.5 rounded-xl border border-[#E8E2D8] dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 space-y-1">
              <p className="font-bold text-stone-800 dark:text-stone-200">
                בקובץ שנטען נמצאו החשבונות הבאים.
              </p>
              <p>
                בחר עבור כל בעל חשבון מהקובץ לאיזה חבר מהחדר לשייך את נכסיו:
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {pendingImportData.distinctOwners.map((rawOwner) => {
                const count = pendingImportData.ownerCounts[rawOwner] || 0;
                return (
                  <div key={rawOwner} className="bg-[#FAF7F2] dark:bg-[#252525] p-3 rounded-xl border border-[#E8E2D8] dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        בעל חשבון בקובץ: <span className="text-[#2E7D32] dark:text-emerald-400 font-black">{rawOwner}</span>
                      </span>
                      <span className="text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 px-2 py-0.5 rounded-full font-bold">
                        {count} חשבונות
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">
                        שייך לחבר בחדר הנוכחי:
                      </label>
                      <select
                        value={userMapping[rawOwner] || ''}
                        onChange={(e) => setUserMapping({ ...userMapping, [rawOwner]: e.target.value })}
                        className="w-full bg-white dark:bg-stone-800 border border-[#DDD6CA] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#4A90E2] cursor-pointer"
                      >
                        {users.map(u => {
                          const uUid = u.uid || u.id;
                          const uName = u.displayName || u.name;
                          return (
                            <option key={uUid} value={uUid}>
                              {uName} ({u.email || uUid})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E8E2D8] dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs rounded-xl border border-[#DDD6CA] dark:border-stone-700 transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessingImport}
                className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>{isProcessingImport ? 'מייבא ומסנכרן...' : 'אשר ייבוא ושיוך נתונים'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

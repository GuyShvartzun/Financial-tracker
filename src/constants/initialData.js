export const DEFAULT_MONTHS = ['08/2026'];

export const INITIAL_ACCOUNTS = [];

export const DEFAULT_BUDGET = {
  incomes: [],
  fixedExpenses: [],
  variableExpenses: [],
  savings: []
};

export const DEFAULT_FIRE_DATA = {
  initialCapital: '',
  monthlyDeposit: '',
  desiredNetMonthlyWithdrawal: '', 
  accumulationReturn: '',
  retirementReturn: '',
  capitalGainsTax: '', 
  annualInflation: '',
  currentAge: '',
  annualManagementFee: '', 
  annualDepositGrowth: '',
  lumpSumAmount: '',
  lumpSumYears: ''
};

export const DEFAULT_CALCULATORS_DATA = {
  pension: {}, // Supports multiple users by user ID
  fire: {},    // Supports multiple users by user ID: fire[userId]
  mortgage: {
    propertyValue: '',
    monthlyIncome: '',
    expectedInflation: '',
    constructionInflation: '',
    tracks: []
  }
};

export const DEFAULT_TASKS = [
  {
    id: 'task_default_1',
    title: 'בדיקת דמי ניהול בקרן הפנסיה וקופות הגמל',
    description: 'לוודא שדמי הניהול מהפקדה אינם עולים על 1.5% ומהצבירה אינם עולים על 0.15%',
    category: 'pension',
    priority: 'medium',
    completed: false,
    assignedTo: '',
    targetMonth: '08/2026',
    createdAt: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'task_default_2',
    title: 'הגדרת הוראת קבע לקרן כספית או קופת גמל להשקעה',
    description: 'הפניית עודפי העו"ש החודשיים לאפיק נזיל נושא תשואה לטובת קרן חירום',
    category: 'savings',
    priority: 'high',
    completed: false,
    assignedTo: '',
    targetMonth: '08/2026',
    createdAt: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'task_default_3',
    title: 'מיפוי וביטול מנויים כפולים והורדת הוצאות תקשורת',
    description: 'בדיקת כרטיסי אשראי על הוראות קבע לא פעילות והוזלת חבילות אינטרנט וסלולר',
    category: 'budget',
    priority: 'low',
    completed: true,
    completedAt: '2026-08-15T00:00:00.000Z',
    assignedTo: '',
    targetMonth: '08/2026',
    createdAt: '2026-08-01T00:00:00.000Z'
  }
];

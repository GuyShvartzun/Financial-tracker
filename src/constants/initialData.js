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
    forexInflation: '',
    tracks: []
  }
};

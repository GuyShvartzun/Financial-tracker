import React, { useState } from 'react';
import { Users, User, Wallet } from 'lucide-react';
import SharedDashboard from './SharedDashboard';
import PersonalDashboard from './PersonalDashboard';
import BudgetTab from '../budget/BudgetTab';

export default function DashboardModule({
  subTab,
  onSubTabChange,
  isSingleMember = false,
  roomStats,
  budgetTotals,
  isPrivacyMode,
  personalStats,
  selectedPersonalUserId,
  setSelectedPersonalUserId,
  selectedMonth,
  monthsList,
  accounts,
  users,
  activeUserId,
  budget,
  onUpdateBudget,
  roomCurrency = 'ILS',
  rates
}) {
  const [internalSubTab, setInternalSubTab] = useState(isSingleMember ? 'personal' : 'shared');
  const activeSub = subTab || internalSubTab;
  const setSub = onSubTabChange || setInternalSubTab;

  return (
    <div className="space-y-6 font-sans">
      {/* Sub navigation: משותף, אישי, תקציב */}
      <div className={`grid gap-2 bg-[#FFFFFF] p-1.5 sm:p-2 rounded-2xl border border-[#E8E2D8] shadow-xs ${
        isSingleMember ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        {!isSingleMember && (
          <button
            type="button"
            onClick={() => setSub('shared')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
              activeSub === 'shared' 
                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
                : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>משותף</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setSub('personal')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
            activeSub === 'personal' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>אישי</span>
        </button>
        <button
          type="button"
          onClick={() => setSub('budget')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
            activeSub === 'budget' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span>תקציב</span>
        </button>
      </div>

      {/* Sub-view Content with smooth tab transition */}
      <div key={activeSub} className="animate-fade-in space-y-6">
        {activeSub === 'shared' && !isSingleMember && (
          <SharedDashboard
            roomStats={roomStats}
            budgetTotals={budgetTotals}
            isPrivacyMode={isPrivacyMode}
            roomCurrency={roomCurrency}
          />
        )}

        {activeSub === 'personal' && (
          <PersonalDashboard
            personalStats={personalStats}
            selectedPersonalUserId={selectedPersonalUserId}
            setSelectedPersonalUserId={setSelectedPersonalUserId}
            selectedMonth={selectedMonth}
            monthsList={monthsList}
            accounts={accounts}
            users={users}
            isSingleMember={isSingleMember}
            roomStats={roomStats}
            budgetTotals={budgetTotals}
            activeUserId={activeUserId}
            isPrivacyMode={isPrivacyMode}
            roomCurrency={roomCurrency}
            rates={rates}
          />
        )}

        {activeSub === 'budget' && (
          <BudgetTab
            budget={budget}
            budgetTotals={budgetTotals}
            users={users}
            isSingleMember={isSingleMember}
            onUpdateBudget={onUpdateBudget}
            isPrivacyMode={isPrivacyMode}
            roomCurrency={roomCurrency}
            rates={rates}
          />
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SetupScreen } from './components/SetupScreen';
import { HomeScreen } from './components/HomeScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { BottomNavBar } from './components/BottomNavBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { stage, setStage, profile, saveBudgetProfile, activeTab, setActiveTab } = useBudget();
  const [pendingUserName, setPendingUserName] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      <OfflineIndicator />

      <AnimatePresence mode="wait">
        {stage === 'WELCOME' && (
          <motion.div
            key="welcome-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
          >
            <WelcomeScreen
              onContinue={(name) => {
                setPendingUserName(name);
                setStage('SETUP');
              }}
            />
          </motion.div>
        )}

        {stage === 'SETUP' && (
          <motion.div
            key="setup-stage"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          >
            <SetupScreen
              initialUserName={pendingUserName || profile?.userName}
              initialProfile={profile}
              isEditing={!!profile}
              onSave={(newProfile) => {
                saveBudgetProfile(newProfile);
              }}
              onBack={profile ? () => setStage('MAIN') : () => setStage('WELCOME')}
            />
          </motion.div>
        )}

        {stage === 'MAIN' && (
          <motion.div
            key="main-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'DAILY' ? (
                <motion.div
                  key="daily-tab"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                >
                  <HomeScreen onOpenEditBudget={() => setStage('SETUP')} />
                </motion.div>
              ) : (
                <motion.div
                  key="insights-tab"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                >
                  <InsightsScreen />
                </motion.div>
              )}
            </AnimatePresence>

            <BottomNavBar activeTab={activeTab} onChangeTab={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}

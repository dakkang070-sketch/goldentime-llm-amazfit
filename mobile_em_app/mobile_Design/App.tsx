import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Members } from './pages/Members';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.MEMBERS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (currentPage) {
      case Page.MEMBERS:
        return <Members />;
      case Page.HISTORY:
        return <History />;
      case Page.SETTINGS:
        return <Settings />;
      default:
        return <Members />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main 
        className={`flex-1 overflow-hidden h-screen bg-slate-50 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
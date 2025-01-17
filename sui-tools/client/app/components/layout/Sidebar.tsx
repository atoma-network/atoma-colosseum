'use client';
import { useCallback } from 'react';
import { useAppContext } from '../../context/appContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  {
    title: "Check Token Balance",
    prompt: "What's my SUI token balance?",
  },
  {
    title: "Pool Information",
    prompt: "Show me the SUI/USDC pool details",
  },
  {
    title: "Recent Transactions",
    prompt: "Show my recent transactions",
  },
  {
    title: "Token Price",
    prompt: "What's the current price of SUI?",
  },
  {
    title: "Gas Fees",
    prompt: "What are the current gas fees?",
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { setQuery } = useAppContext();
  
  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
  };

  // Close sidebar when clicking overlay on mobile
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-gray-50 dark:bg-gray-900 transform transition-transform duration-300 ease-in-out z-30 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {/* <Image
                src="/logo.svg"
                alt="SuiSage Logo"
                width={32}
                height={32}
              /> */}
              <p  style={{
                fontFamily:'cursive'
              }}>SuiSage</p>
              <h1 className="font-semibold text-xl">SuiSage</h1>
            </div>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto p-4">
      

            {/* Suggestions Section */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Try asking about</h2>
              <div className="space-y-2">
                {SUGGESTED_PROMPTS.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(item.prompt)}
                    className="w-full text-left p-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    {item.title}
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

     
        </div>
      </aside>
    </>
  );
}

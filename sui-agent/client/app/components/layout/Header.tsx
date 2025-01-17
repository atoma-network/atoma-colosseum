interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 px-4">
      <div className="h-full flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        
        <div className="flex items-center gap-4">
          {/* Add any header actions here */}
        </div>
      </div>
    </header>
  );
}

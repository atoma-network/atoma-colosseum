interface ChatMessageProps {
  role: 'ai' | 'user';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-4 items-start">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white
          ${role === 'ai' ? 'bg-blue-600' : 'bg-green-600'}`}>
          {role === 'ai' ? 'AI' : 'U'}
        </div>
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="text-gray-800 dark:text-gray-200">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
} 
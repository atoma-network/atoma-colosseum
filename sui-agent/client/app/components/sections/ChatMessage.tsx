import React from 'react';

interface ChatMessageProps {
  role: 'ai' | 'user';
  content: string;
}

function formatContent(content: string) {
  // Check if content is a pool list (numbered items)
  if (content.match(/^\d+\. Pool/m)) {
    const pools = content.split('\n\n');
    return (
      <div className="space-y-4 w-full">
        {pools.map((pool, index) => {
          const [title, ...details] = pool.split('\n');
          const poolId = title.match(/Pool (0x[a-fA-F0-9]+)/)?.[1] || '';
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-3 break-words">
              <div className="font-medium flex items-center justify-between">
                <span>{title.replace(poolId, poolId.slice(0, 8) + '...')}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(poolId)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Copy ID
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-2 overflow-hidden text-ellipsis">
                {poolId}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {details.map((detail, i) => (
                  <div key={i} className="break-words">{detail.trim()}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Check if content is a pool info (contains "Pool Information")
  if (content.includes('Pool Information')) {
    const sections = content.split('\n\n');
    return (
      <div className="space-y-4 w-full">
        {sections.map((section, index) => {
          if (section.includes('================')) {
            return <h2 key={index} className="font-bold text-lg break-words">{sections[0]}</h2>;
          }
          if (section.startsWith('Tokens and Reserves:')) {
            const [title, ...items] = section.split('\n');
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium mb-2">{title}</div>
                <div className="font-mono text-sm overflow-x-auto">
                  {items.map((item, i) => (
                    <div key={i} className="whitespace-nowrap">{item.trim()}</div>
                  ))}
                </div>
              </div>
            );
          }
          if (section.startsWith('Pool Stats:')) {
            const [title, ...stats] = section.split('\n');
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium mb-2">{title}</div>
                <div className="space-y-1">
                  {stats.map((stat, i) => (
                    <div key={i} className="break-words">{stat.trim()}</div>
                  ))}
                </div>
              </div>
            );
          }
          return <div key={index} className="break-words">{section}</div>;
        })}
      </div>
    );
  }

  // Check if content is a price display (single token or multiple)
  if (content.includes('$') && content.includes('%')) {
    const prices = content.split('\n');
    return (
      <div className="space-y-2 w-full">
        {prices.map((price, index) => {
          const [symbol, priceInfo] = price.split(': ');
          const [amount, change] = priceInfo.split(' ');
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
              <span className="font-medium">{symbol}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{amount}</span>
                <span className={`text-sm ${
                  change.includes('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change.replace('(', '').replace(')', '')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Check if content is a spot price
  if (content.startsWith('Spot Price:')) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 w-full">
        <div className="flex items-center justify-between flex-wrap">
          <span className="font-medium">Spot Price:</span>
          <span className="font-mono ml-2 break-all">{content.split(':')[1].trim()}</span>
        </div>
      </div>
    );
  }

  // Default formatting for regular text
  return <div className="whitespace-pre-wrap break-words">{content}</div>;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`max-w-[85%] rounded-lg p-4 overflow-hidden ${
        role === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-white border border-gray-200'
      }`}>
        {role === 'user' ? (
          <div className="break-words">{content}</div>
        ) : (
          formatContent(content)
        )}
      </div>
    </div>
  );
} 
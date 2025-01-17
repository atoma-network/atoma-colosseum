'use client'
import React from "react";
import api from "./lib/axios";
import { useAppContext } from './context/appContext';

interface QueryResult {
  status: "success" | "error" | "needs_info";
  error?: string;
  final_answer?: string;
  reasoning?: string;
  results?: unknown[];
  request?: string;
}

export default function Home() {
  const { query, setQuery, messages, addMessage } = useAppContext();

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) { 
    setQuery(event.target.value);
  }

  async function handleSubmit() {
    if (!query.trim()) return;

    // Add user message
    addMessage({ role: 'user', content: query });
    
    try {
      const res = await api.post('/query', { query });
      const data = res.data as QueryResult;
      console.log(data)
      // Handle different response types
      if (data.status === 'success' && data.final_answer) {
        addMessage({ role: 'ai', content: data.final_answer });
      } else if (data.status === 'needs_info' && data.request) {
        console.log('hiiii')
        addMessage({ role: 'ai', content: 'I need more information to process your request.' });
      } else if (data.status === 'error' && data.error) {
        addMessage({ role: 'ai', content: `Error: ${data.error}` });
      }else{
        addMessage({
          role: "ai",
          content: "I need more information to process your request.",
        });
      }
    } catch (error) {
     console.log(error)
      addMessage({ 
        role: 'ai', 
        content: 'Sorry, I encountered an error processing your request.' 
      });
     
    }

    // Clear input after sending
    setQuery('');
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 '
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Chat input */}
      <div className="border-t border-gray-200  p-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Ask anything about Sui..."
              className="w-full p-4 pr-12 rounded-lg border border-gray-200 bg-white  focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button 
              onClick={handleSubmit}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

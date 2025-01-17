'use client';
import React, { createContext, useContext, useState } from 'react';

interface Message {
  role: 'ai' | 'user';
  content: string;
}

interface AppContextType {
  query: string;
  setQuery: (query: string) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: "Hello! I'm SuiSage, your Sui blockchain assistant. How can I help you today?"
    }
  ]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return (
    <AppContext.Provider value={{ query, setQuery, messages, addMessage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

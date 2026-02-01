"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid'
import { SendHorizontal, Bot, User, Menu, Sparkles, FileText, Paperclip, X, LayoutGrid, MessageSquare, Plus, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { SignInButton, UserButton, SignedIn, SignedOut, useUser, useClerk } from '@clerk/nextjs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { extractTextFromFile } from "@/lib/fileToText";
import axios from "axios";

export default function Home() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [messages, setMessages] = useState<{ role: string; content: string; file?: string; fileText?: string }[]>([]);
  const [dbMessages, setDbMessages] = useState<{ role: string; content: string; }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [recentChats, setRecentChats] = useState<{ id: string, title: string }[]>([]);
  const [reFetchRecentChats, setReFetchRecentChats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  


  const fetchRecentChats = async () => {
    try {
      const response = await axios.get("/api/chat");
      setRecentChats(response.data);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      setCurrentChatId(chatId);
      const response = await axios.get(`/api/getMessages?chatId=${chatId}`);
      setMessages(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load messages", err);
      setIsLoading(false);
    }
  };


  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    fetchRecentChats();
  }, [reFetchRecentChats]);


  function generateUniqueId(): string {
    return uuidv4();
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setDbMessages([]);
    setReFetchRecentChats(true);
  }
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;
    if (!inputValue.trim() && !selectedFile) return;

    let fileText: string | undefined;
    if (selectedFile) {
      setIsExtracting(true);
      try {
        fileText = await extractTextFromFile(selectedFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read document. Try another file.");
        setIsExtracting(false);
        return;
      }
      setIsExtracting(false);
    }

    // If no chat exists yet, create one
    let chatId = currentChatId;
    if (!chatId) {
      chatId = generateUniqueId();
      setCurrentChatId(chatId);

      const response = await axios.post("/api/addChat", {
        id: chatId,
        user_id: user?.id,
        title: inputValue.slice(0, 40)
      });
      setReFetchRecentChats(prev => !prev);
    }
    const newMessage = {
      role: "user",
      content: inputValue,
      file: selectedFile ? selectedFile.name : undefined,
      fileText: fileText
    };

    // Capture inputValue before clearing it
    const currentInput = inputValue;

    // Update local messages state
    setMessages(prev => [...prev, newMessage]);
    setDbMessages(prev => [...prev, { role: "user", content: inputValue }]);

    if (chatId) {
      await axios.post("/api/addMessage", {
        chat_id: chatId,
        role: "user",
        content: inputValue
      });
    }

    setInputValue("");
    removeFile();

    const addDoc = async () => {
      const response = await axios.post("/api/rag/add", {
        text: fileText,
        chat_id: chatId,
        user_id: user?.id
      });
      console.log(response.data);
    };

    const queryDoc = async () => {
      try {
        const params = new URLSearchParams({
          q: currentInput,
          user_id: user?.id ?? "",
        });

        if (chatId) {
          params.append("chat_id", chatId);
        }

        const response = await fetch(
          `/api/rag/query?${params.toString()}`,
          { method: "POST" }
        );

        setIsLoading(false);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          fullText += decoder.decode(value, { stream: true });

          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: "assistant", content: fullText },
          ]);
        }

        if (chatId && fullText) {
          await axios.post("/api/addMessage", {
            chat_id: chatId,
            role: "assistant",
            content: fullText
          });
        }
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      }
    };


    if (fileText) {
      await addDoc();
    }
    setIsLoading(true);
    await queryDoc();
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-hidden">

      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-[72px]"
          } relative flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <div className={`flex items-center gap-2 overflow-hidden ${!isSidebarOpen && "hidden"}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5 fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight truncate">AskYourDocs</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-md p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
        </div>

        <div className="p-3">
          <button onClick={handleNewChat}
            className={`flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all ${!isSidebarOpen && "justify-center px-0"}`}
          >
            <Plus className="h-5 w-5" />
            {isSidebarOpen &&
              <span>New Chat</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isSidebarOpen && <h4 className="text-xs font-medium text-muted-foreground px-2 mb-2">Recent Chats</h4>}

          {/* Empty State for Chats */}
          {recentChats.length === 0 || !isSidebarOpen ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              {isSidebarOpen && (
                <p className="text-xs text-muted-foreground">No recent chats</p>
              )}
            </div>
          ) : (
            recentChats.map((chat, index) => (
              <button
                key={index}
                onClick={() => loadChat(chat.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary transition-colors truncate ${currentChatId === chat.id ? 'bg-secondary' : ''}`}
              >
                {chat.title}
              </button>
            ))
          )}

        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-border/50">
          <SignedIn>
            <div className={`flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors ${!isSidebarOpen && "justify-center"}`}>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9 border border-border",
                    userButtonOuterIdentifier: "hidden"
                  }
                }}
              />
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-medium truncate">
                    {user?.fullName || user?.username || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-32">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              )}
            </div>
          </SignedIn>
          <SignedOut>
            <div className={`flex justify-center ${isSidebarOpen ? "w-full" : ""}`}>
              <SignInButton mode="modal">
                <button
                  className={`flex items-center gap-2 rounded-lg p-2 hover:bg-secondary transition-colors text-sm font-medium ${isSidebarOpen ? "w-full justify-start" : "justify-center"}`}
                >
                  <div className="h-9 w-9 flex items-center justify-center rounded-full bg-secondary">
                    <LogOut className="h-4 w-4" />
                  </div>
                  {isSidebarOpen && <span>Sign In</span>}
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header / Top Bar */}
        <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-6 shrink-0">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <div className="flex items-center gap-3 group cursor-pointer animate-in fade-in zoom-in duration-300">
                <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5 fill-current" />
                </div>
                <span className="text-lg font-bold tracking-tight">AskYourDocs</span>
              </div>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-4 md:p-8 space-y-6 scroll-smooth">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
                <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight">Ask anything about your documents</h3>
                <p className="text-base text-muted-foreground mt-2 max-w-lg">Upload a file to get started or type a query below to explore your data.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
              >
                <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${msg.role === 'user' ? 'bg-foreground text-background border-transparent' : 'bg-card border-border'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                  </div>

                  {/* Bubble */}
                  <div className={`group relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card text-card-foreground border border-border rounded-tl-sm'
                    }`}>
                    {msg.file && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/10 dark:bg-white/10 p-2 text-xs font-mono">
                        <FileText className="h-3 w-3" />
                        {msg.file}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.content === "" ? (
                      <div className="flex gap-1.5 items-center h-4">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      msg.content
                    )}

                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex max-w-[80%] gap-4 flex-row">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm bg-card border-border">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-5 py-3.5 bg-card border border-border shadow-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="h-4" /> {/* Spacer */}
          </div>

          {/* Input Area */}
          <div className="w-full p-4 md:p-6 bg-background border-t border-border/50">
            <div className="mx-auto max-w-2xl w-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`relative ${!isSignedIn || isExtracting ? "cursor-not-allowed opacity-60" : ""}`}>
                      <form onSubmit={handleSendMessage} className={`relative group ${!isSignedIn || isExtracting ? "pointer-events-none" : ""}`}>
                        
                        <div className="absolute bottom-full left-0 right-0 flex flex-col gap-2 pb-2 pointer-events-none">
                          {/* Error Message */}
                          {error && (
                            <div className="animate-in slide-in-from-bottom-2 fade-in duration-200 z-50 pointer-events-auto">
                              <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 pr-3 shadow-sm w-fit max-w-full backdrop-blur-md">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500 text-white">
                                  <X className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-medium text-red-600 dark:text-red-400 truncate">{error}</span>
                                <button
                                  type="button"
                                  onClick={() => setError(null)}
                                  className="ml-2 rounded-full p-1 hover:bg-red-500/20 transition-colors"
                                >
                                  <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* File Preview */}
                          {selectedFile && (
                            <div className="animate-in slide-in-from-bottom-2 fade-in duration-200 pointer-events-auto">
                              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 pr-3 shadow-sm w-fit">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium truncate max-w-[150px]">{selectedFile.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="ml-2 rounded-full p-1 hover:bg-secondary transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="absolute inset-0 -m-0.5 rounded-2xl bg-linear-to-r from-primary/50 to-purple-500/50 opacity-20 transition-opacity group-hover:opacity-100 blur-sm" />
                        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">

                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.docx,.md"
                            className="hidden"
                            disabled={!isSignedIn}
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isSignedIn}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed"
                          >
                            <Paperclip className="h-5 w-5" />
                          </button>

                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isSignedIn ? "Ask your docs..." : "Sign in to chat..."}
                            disabled={!isSignedIn}
                            className="flex-1 bg-transparent px-2 py-2.5 text-sm font-medium placeholder:text-muted-foreground/70 focus:outline-none font-mono disabled:cursor-not-allowed"
                          />

                          <button
                            type="submit"
                            disabled={!isSignedIn || isExtracting || (!inputValue.trim() && !selectedFile)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            title={isExtracting ? "Reading document…" : undefined}
                          >
                            {isExtracting ? (
                              <span className="text-xs font-medium">…</span>
                            ) : (
                              <SendHorizontal className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </TooltipTrigger>
                  {!isSignedIn && (
                    <TooltipContent>
                      <p>Please sign in to send messages</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <div className="mt-2 text-center text-[10px] text-muted-foreground">
                AI can make mistakes. Please verify important information.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
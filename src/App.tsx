import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { themeChange } from "theme-change";
import { LLMModel } from "./components/LLMSelector";
import SettingsDialog from "./components/SettingsDialog";
import HistoryDialog from "./components/HistoryDialog";
import {
  getModels,
  getApiKeyInfo,
  getComparisons,
  saveComparison,
  getModelCompletion,
  Comparison,
  ComparisonResponse,
} from "./services/api";
import ReactMarkdown from "react-markdown";
import ModelSelector from "./components/ModelSelector";
import ModelBadge from "./components/ModelBadge";
import Logo from "./components/Logo";
import ThemeSwitcher from "./components/ThemeSwitcher";
import "./App.css";
import ComparisonCard from "./components/ComparisonCard";

interface ComparisonConfig {
  id: string;
  userPrompt: string;
  systemPrompt: string;
  modelId: string;
  temperature: number;
}

interface ComparisonResult {
  config: ComparisonConfig;
  response: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatHistory {
  configId: string;
  messages: Message[];
}

function App() {
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingModel, setLoadingModel] = useState<string>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<LLMModel[]>([]);
  const [configs, setConfigs] = useState<ComparisonConfig[]>([
    {
      id: "1",
      userPrompt: "",
      systemPrompt: "",
      modelId: "",
      temperature: 0.7,
    },
  ]);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [recentComparisons, setRecentComparisons] = useState<Comparison[]>([]);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [hideConfigs, setHideConfigs] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showContinueAll, setShowContinueAll] = useState(false);
  const [continueAllPrompt, setContinueAllPrompt] = useState("");
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  useEffect(() => {
    // Initialize theme-change
    themeChange(false);
    // false parameter to not store theme in localStorage
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    loadModels();
    loadComparisons();
  }, []);

  useEffect(() => {
    if (availableModels.length > 0) {
      const savedConfigs = localStorage.getItem("promptlens_configs");
      if (savedConfigs) {
        setConfigs(JSON.parse(savedConfigs));
      }
    }
  }, [availableModels]);

  const loadModels = async () => {
    try {
      const models = await getModels();
      setAvailableModels(
        models.map((model) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          latency: model.latency,
          contextWindow: model.context_window,
          maxOutputTokens: model.max_output_tokens,
          inputCostPer1M: model.input_cost_per_1m,
          outputCostPer1M: model.output_cost_per_1m,
          isFavorite: model.isFavorite,
          temperature: model.provider === 'openai' ? 1 : 0.7,
        }))
      );
    } catch (error) {
      console.error("Error loading models:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load models"
      );
    }
  };

  const loadComparisons = async () => {
    try {
      const comparisons = await getComparisons();
      setRecentComparisons(comparisons);
    } catch (error) {
      console.error("Error loading comparisons:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load comparisons"
      );
    }
  };

  const handleCompare = async () => {
    setError(null);
    setHideConfigs(true);

    // Create initial loading state
    const initialResults = configs.map((config) => ({
      config,
      response: "Loading...",
      tokensUsed: 0,
      cost: 0,
      responseTime: 0,
    }));
    setResults(initialResults);

    // Initialize chat histories with both system prompt and user prompt
    setChatHistories(
      configs.map((config) => ({
        configId: config.id,
        messages: [
          ...(config.systemPrompt
            ? [{ role: "system" as const, content: config.systemPrompt }]
            : []),
          { role: "user" as const, content: config.userPrompt },
        ],
      }))
    );

    try {
      const keyInfo = await getApiKeyInfo();
      const configuredProviders = new Set(
        keyInfo.filter((k) => k.exists).map((k) => k.provider)
      );

      if (!configuredProviders.size) {
        throw new Error("Please configure your API keys in settings");
      }

      // Check if any selected model's provider is not configured
      const missingProviders = configs.some((config) => {
        const model = availableModels.find((m) => m.id === config.modelId);
        return model && !configuredProviders.has(model.provider);
      });

      if (missingProviders) {
        throw new Error(
          "Some selected models require unconfigured API keys. Please check your settings."
        );
      }

      const updatedResults: ComparisonResult[] = [...initialResults];

      // Create an array of promises for parallel execution
      const completionPromises = configs.map((config, index) => {
        setLoadingModel(`${config.modelId}-${config.id}`);
        const startTime = Date.now();

        return getModelCompletion({
          modelId: config.modelId,
          userPrompt: config.userPrompt,
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          messages: [],
        }).then((response) => {
          // Handle streaming response
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let fullResponse = "";

          return new Promise<void>(async (resolve, reject) => {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.content) {
                        fullResponse = data.fullResponse;
                        updatedResults[index] = {
                          config,
                          response: fullResponse,
                          tokensUsed: 0,
                          cost: 0,
                          responseTime: data.responseTimeMs / 1000,
                        };
                        setResults([...updatedResults]);
                      } else if (data.done) {
                        console.log("Final completion data:", {
                          tokens: data.totalTokens,
                          rawCost: data.cost,
                          formattedCost: data.cost.toFixed(6),
                        });
                        updatedResults[index] = {
                          config,
                          response: data.fullResponse,
                          tokensUsed: data.totalTokens,
                          cost: data.cost,
                          responseTime: data.responseTimeMs / 1000,
                        };
                        setResults([...updatedResults]);
                      }
                    } catch (e) {
                      console.error("Error parsing SSE data:", e);
                    }
                  }
                }
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

      // Wait for all completions to finish
      await Promise.all(completionPromises);

      // Save the comparison
      await saveComparison(
        configs[0].systemPrompt,
        configs[0].userPrompt,
        updatedResults.map((result) => ({
          modelId: result.config.modelId,
          response: result.response,
          tokensUsed: result.tokensUsed,
          responseTime: result.responseTime,
          cost: result.cost,
        }))
      );

      // Refresh the comparison history
      await loadComparisons();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setLoadingModel(undefined);
    }
  };

  const handleNewComparison = () => {
    setConfigs([
      ...configs,
      {
        id: Date.now().toString(),
        userPrompt: "",
        systemPrompt: "",
        modelId: "",
        temperature: 0.7,
      },
    ]);
    setHideConfigs(false);
  };

  const handleCopyConfig = (config: ComparisonConfig) => {
    const newConfig = {
      ...config,
      id: Date.now().toString(),
    };
    setConfigs([...configs, newConfig]);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleRemoveConfig = (id: string) => {
    if (configs.length > 1) {
      setConfigs(configs.filter((c) => c.id !== id));
    }
  };

  const handleUpdateConfig = (
    id: string,
    updates: Partial<ComparisonConfig>
  ) => {
    setConfigs(
      configs.map((config) =>
        config.id === id ? { ...config, ...updates } : config
      )
    );
  };

  const handleCopyFromFirst = (configId: string) => {
    const firstConfig = configs[0];
    handleUpdateConfig(configId, {
      userPrompt: firstConfig.userPrompt,
      systemPrompt: firstConfig.systemPrompt,
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        // If there's natural horizontal scrolling, let it happen
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          return;
        }

        // Check if we're in a vertical scrollable container
        const target = e.target as HTMLElement;
        const scrollableParent = target.closest(
          ".overflow-y-auto, .overflow-auto"
        );
        if (scrollableParent) {
          // Let the vertical scroll happen naturally
          return;
        }

        // Only convert vertical to horizontal scroll in the card comparison container
        if (e.shiftKey || (!e.shiftKey && Math.abs(e.deltaY) > 0)) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, []);

  const handleLoadComparison = (comparison: Comparison) => {
    const responses =
      typeof comparison.responses === "string"
        ? (JSON.parse(comparison.responses) as ComparisonResponse[])
        : comparison.responses;

    setConfigs(
      responses.map((response) => ({
        id: Date.now().toString(),
        userPrompt: comparison.user_prompt,
        systemPrompt: comparison.system_prompt,
        modelId: response.modelId,
        temperature: 0.7,
      }))
    );
    setShowHistory(false);
    setHideConfigs(false);
    setResults([]);
  };

  // Save configs to localStorage
  useEffect(() => {
    if (availableModels.length > 0) {
      localStorage.setItem("promptlens_configs", JSON.stringify(configs));
    }
  }, [configs, availableModels]);

  // Clear results when configs change
  useEffect(() => {
    if (
      results.length > 0 &&
      !results.every((r) => configs.some((c) => c.id === r.config.id))
    ) {
      setResults([]);
      setHideConfigs(false);
    }
  }, [configs, results]);

  const handleContinueAll = async () => {
    if (!continueAllPrompt.trim()) return;

    setError(null);

    // Add the new user message to all chat histories
    setChatHistories((prev) => {
      return prev.map((h) => ({
        ...h,
        messages: [
          ...h.messages,
          { role: "user" as const, content: continueAllPrompt },
        ],
      }));
    });

    // Create initial loading state
    const initialResults = configs.map((config) => ({
      config: {
        ...config,
        userPrompt: continueAllPrompt,
      },
      response: "Loading...",
      tokensUsed: 0,
      cost: 0,
      responseTime: 0,
    }));
    setResults((prev) => [...prev, ...initialResults]);

    try {
      const keyInfo = await getApiKeyInfo();
      const configuredProviders = new Set(
        keyInfo.filter((k) => k.exists).map((k) => k.provider)
      );

      if (!configuredProviders.size) {
        throw new Error("Please configure your API keys in settings");
      }

      // Check if any selected model's provider is not configured
      const missingProviders = configs.some((config) => {
        const model = availableModels.find((m) => m.id === config.modelId);
        return model && !configuredProviders.has(model.provider);
      });

      if (missingProviders) {
        throw new Error(
          "Some selected models require unconfigured API keys. Please check your settings."
        );
      }

      // Create an array of promises for parallel execution
      const completionPromises = configs.map((config, index) => {
        const model = availableModels.find((m) => m.id === config.modelId)!;
        setLoadingModel(`${config.modelId}-${config.id}`);

        // Get chat history for this config
        const history =
          chatHistories.find((h) => h.configId === config.id)?.messages || [];

        return getModelCompletion({
          modelId: config.modelId,
          userPrompt: continueAllPrompt,
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          messages: history.filter((m) => m.role !== "system"),
        }).then((response) => {
          // Handle streaming response
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let fullResponse = "";

          return new Promise<void>(async (resolve, reject) => {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.content) {
                        fullResponse = data.fullResponse;
                        setResults((prev) => {
                          const lastResult =
                            prev[prev.length - configs.length + index];
                          if (lastResult.config.id === config.id) {
                            return [
                              ...prev.slice(
                                0,
                                prev.length - configs.length + index
                              ),
                              {
                                ...lastResult,
                                response: fullResponse,
                              },
                              ...prev.slice(
                                prev.length - configs.length + index + 1
                              ),
                            ];
                          }
                          return prev;
                        });
                      } else if (data.done) {
                        console.log("Final completion data:", {
                          tokens: data.totalTokens,
                          rawCost: data.cost,
                          formattedCost: data.cost.toFixed(6),
                        });
                        setResults((prev) => {
                          const lastResult =
                            prev[prev.length - configs.length + index];
                          if (lastResult.config.id === config.id) {
                            return [
                              ...prev.slice(
                                0,
                                prev.length - configs.length + index
                              ),
                              {
                                ...lastResult,
                                response: data.fullResponse,
                                tokensUsed: data.totalTokens,
                                cost: data.cost,
                                responseTime: data.responseTimeMs / 1000,
                              },
                              ...prev.slice(
                                prev.length - configs.length + index + 1
                              ),
                            ];
                          }
                          return prev;
                        });
                      }
                    } catch (e) {
                      console.error("Error parsing SSE data:", e);
                    }
                  }
                }
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

      await Promise.all(completionPromises);
      setLoadingModel(undefined);
      setShowContinueAll(false);
      setContinueAllPrompt("");
    } catch (error) {
      console.error("Error in comparison:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during comparison"
      );
      setLoadingModel(undefined);
    }
  };

  const handleContinue = async (
    configId: string,
    prompt: string,
    messages: Message[]
  ) => {
    if (!prompt.trim()) return;

    setError(null);
    const config = configs.find((c) => c.id === configId)!;

    // Add the new user message to chat history
    setChatHistories((prev) => {
      const newHistories = prev.map((h) => {
        if (h.configId === configId) {
          return {
            ...h,
            messages: [
              ...h.messages,
              { role: "user" as const, content: prompt },
            ],
          };
        }
        return h;
      });
      return newHistories;
    });

    // Create initial loading state
    const initialResult = {
      config: {
        ...config,
        userPrompt: prompt,
      },
      response: "Loading...",
      tokensUsed: 0,
      cost: 0,
      responseTime: 0,
    };
    setResults((prev) => [...prev, initialResult]);

    try {
      const keyInfo = await getApiKeyInfo();
      const configuredProviders = new Set(
        keyInfo.filter((k) => k.exists).map((k) => k.provider)
      );

      if (!configuredProviders.size) {
        throw new Error("Please configure your API keys in settings");
      }

      const model = availableModels.find((m) => m.id === config.modelId);
      if (!model || !configuredProviders.has(model.provider)) {
        throw new Error(
          "Selected model requires unconfigured API key. Please check your settings."
        );
      }

      setLoadingModel(`${config.modelId}-${config.id}`);

      const response = await getModelCompletion({
        modelId: config.modelId,
        userPrompt: prompt,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        messages: messages.filter((m) => m.role !== "system"),
      });

      // Handle streaming response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse = data.fullResponse;
                  setResults((prev) => {
                    const lastResult = prev[prev.length - 1];
                    if (lastResult.config.id === config.id) {
                      return [
                        ...prev.slice(0, -1),
                        {
                          ...lastResult,
                          response: fullResponse,
                        },
                      ];
                    }
                    return prev;
                  });
                } else if (data.done) {
                  console.log("Final completion data:", {
                    tokens: data.totalTokens,
                    rawCost: data.cost,
                    formattedCost: data.cost.toFixed(6),
                  });
                  setResults((prev) => {
                    const lastResult = prev[prev.length - 1];
                    if (lastResult.config.id === config.id) {
                      return [
                        ...prev.slice(0, -1),
                        {
                          ...lastResult,
                          response: data.fullResponse,
                          tokensUsed: data.totalTokens,
                          cost: data.cost,
                          responseTime: data.responseTimeMs / 1000,
                        },
                      ];
                    }
                    return prev;
                  });
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in streaming response:", error);
        throw error;
      }

      setLoadingModel(undefined);
    } catch (error) {
      console.error("Error in continuation:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during continuation"
      );
      setLoadingModel(undefined);
    }
  };

  // Update chat history when results change
  useEffect(() => {
    const newHistories = results.reduce(
      (acc: ChatHistory[], result) => {
        const existingHistory = acc.find(
          (h) => h.configId === result.config.id
        );
        if (existingHistory) {
          // Only update the last assistant message if it's a streaming response
          if (result.response !== "Loading...") {
            const lastMessage =
              existingHistory.messages[existingHistory.messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = result.response;
            } else {
              existingHistory.messages.push({
                role: "assistant",
                content: result.response,
              });
            }
          }
        } else {
          // This is the initial conversation, add both user and assistant messages
          const messages: Message[] = [];
          if (result.config.systemPrompt) {
            messages.push({
              role: "system",
              content: result.config.systemPrompt,
            });
          }
          messages.push({ role: "user", content: result.config.userPrompt });
          if (result.response !== "Loading...") {
            messages.push({ role: "assistant", content: result.response });
          }
          acc.push({ configId: result.config.id, messages });
        }
        return acc;
      },
      chatHistories.map((h) => ({ ...h, messages: [...h.messages] }))
    );

    setChatHistories(newHistories);
  }, [results]);

  // Clear chat histories when configs change
  useEffect(() => {
    if (results.length === 0) {
      setChatHistories([]);
    }
  }, [configs]);

  // Update gradient visibility based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const updateGradients = () => {
        const hasHorizontalScroll =
          container.scrollWidth > container.clientWidth;
        setShowLeftGradient(hasHorizontalScroll && container.scrollLeft > 0);
        setShowRightGradient(
          hasHorizontalScroll &&
            container.scrollLeft < container.scrollWidth - container.clientWidth
        );
      };

      updateGradients();
      container.addEventListener("scroll", updateGradients);
      window.addEventListener("resize", updateGradients);

      return () => {
        container.removeEventListener("scroll", updateGradients);
        window.removeEventListener("resize", updateGradients);
      };
    }
  }, [configs.length]); // Re-run when number of cards changes

  // Add scroll handler function
  const handleScroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 450; // One card width
      const targetScroll =
        container.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full flex flex-col min-h-screen">
      <header className="py-6 px-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-2"
          >
            <button
              onClick={() => {
                setConfigs([
                  {
                    id: Date.now().toString(),
                    userPrompt: "",
                    systemPrompt: "",
                    modelId: "",
                    temperature: 0.7,
                  },
                ]);
                setResults([]);
                setHideConfigs(false);
              }}
              className="btn btn-ghost gap-2"
              title="Start New"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Start New
            </button>
            <ThemeSwitcher />
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-ghost btn-circle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-ghost btn-circle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-auto">
        {/* Comparison Cards Container */}
        <div className="relative flex-1">
          {/* Left scroll button */}
          <div
            onClick={() => handleScroll("left")}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 cursor-pointer bg-base-200 rounded-r-lg p-2 hover:bg-base-300 ${showLeftGradient ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-base-content"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>

          {/* Right scroll button */}
          <div
            onClick={() => handleScroll("right")}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 cursor-pointer bg-base-200 rounded-l-lg p-2 hover:bg-base-300 ${showRightGradient ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-base-content"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 p-4 overflow-x-auto flex-1 relative"
            style={{ overflow: "auto visible" }}
          >
            {configs.map((config, index) => (
              <ComparisonCard
                key={config.id}
                config={config}
                result={results.find((r) => r.config.id === config.id)}
                chatHistory={
                  chatHistories.find((h) => h.configId === config.id)
                    ?.messages || []
                }
                isFirst={index === 0}
                loadingModel={loadingModel}
                availableModels={availableModels}
                onUpdateConfig={handleUpdateConfig}
                onRemove={handleRemoveConfig}
                onCopyFromFirst={handleCopyFromFirst}
                onContinue={handleContinue}
                setAvailableModels={setAvailableModels}
                forceHideConfig={hideConfigs}
              />
            ))}

            {/* Add Model Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[450px] flex-shrink-0"
            >
              <div
                className="card glass-panel border-2 border-dashed border-base-300 cursor-pointer hover:bg-base-200 transition-colors h-[180px]"
                onClick={handleNewComparison}
              >
                <div className="card-body items-center justify-center text-center p-3">
                  <h3 className="text-base  font-medium">Add Model</h3>
                  <p className="text-sm opacity-60">
                    Compare with another model
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center space-y-4"
          >
            {showContinueAll ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-2xl space-y-2"
              >
                <textarea
                  className="textarea textarea-bordered w-full font-mono text-sm h-24"
                  placeholder="Enter your follow-up prompt for all models..."
                  value={continueAllPrompt}
                  onChange={(e) => setContinueAllPrompt(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowContinueAll(false);
                      setContinueAllPrompt("");
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinueAll}
                    disabled={!continueAllPrompt.trim()}
                    className="btn btn-primary"
                  >
                    Send to All
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex justify-center space-x-4">
                {results.length > 0 && (
                  <button
                    onClick={() => setShowContinueAll(true)}
                    className="btn btn-ghost"
                  >
                    Continue All
                  </button>
                )}
                <button
                  onClick={handleCompare}
                  disabled={!configs.every((c) => c.modelId && c.userPrompt)}
                  className="btn btn-primary"
                >
                  Compare
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={async () => {
          setIsSettingsOpen(false);
          await loadModels();
        }}
      />

      <HistoryDialog
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        comparisons={recentComparisons}
        onLoadComparison={handleLoadComparison}
      />
    </div>
  );
}

export default App;

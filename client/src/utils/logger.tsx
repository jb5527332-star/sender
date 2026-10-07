"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { Log, LoggerContextType, LogLevel } from "@/interfaces/utils-interface";

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export function LoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Log[]>([
    {
      time: new Date().toLocaleTimeString(),
      message: "System initialized and ready",
      level: "info",
    },
  ]);

  const addLogEntry = (message: string, level: LogLevel = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, { time, message, level }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LoggerContext.Provider value={{ logs, addLogEntry, clearLogs }}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger() {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error("useLogger must be used within a LoggerProvider");
  }
  return context;
}

import { useState, useCallback } from "react";

interface ErrorState {
  message: string;
  error?: unknown;
  timestamp: Date;
}

export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const handleError = useCallback((message: string, error?: unknown) => {
    console.error(message, error);
    setErrors((prev) => [
      {
        message,
        error,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    errors,
    handleError,
    clearErrors,
    clearError,
  };
} 
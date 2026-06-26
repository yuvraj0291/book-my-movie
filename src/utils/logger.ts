type LogContext = Record<string, any>;

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  warn(message: string, context?: LogContext) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  error(message: string, error?: any, context?: LogContext) {
    const errorDetails = error instanceof Error 
      ? { errorMessage: error.message, stack: error.stack } 
      : { error };

    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        message,
        ...errorDetails,
        ...context,
      })
    );
  },
};

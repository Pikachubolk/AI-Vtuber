export class ErrorBoundary {
    static wrap(component, fallback) {
        return async (...args) => {
            try {
                return await component(...args);
            } catch (error) {
                console.error('Error in component:', error);
                if (typeof fallback === 'function') {
                    return fallback(error);
                }
                throw error;
            }
        };
    }
} 
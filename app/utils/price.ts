export const fetchXlmPrice = async (): Promise<number> => {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd'
        );

        if (!response.ok) {
            throw new Error('Failed to fetch price');
        }

        const data = await response.json();
        return data.stellar.usd;
    } catch (error) {
        console.warn('Error fetching XLM price, using fallback:', error);
        return 0.10; // Fallback price
    }
};

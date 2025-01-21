import axios from 'axios';

export async function getCoinPrice(coin: string): Promise<string> {
    try {
        const response: any = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: {
                ids: coin,
                vs_currencies: 'usd',
            },
        });

        const price = response.data[coin]?.usd;
        if (price !== undefined) {
            return `The current price of ${coin} is $${price}.`;
        } else {
            return `Price information for ${coin} is not available.`;
        }
    } catch (error: any) {
        return `Error fetching price for ${coin}: ${error.message}`;
    }
}
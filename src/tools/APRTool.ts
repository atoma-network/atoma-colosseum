import { Aftermath } from "aftermath-ts-sdk";

class AftermathTool {
    private static instance: Aftermath | null = null;

    static getInstance(): Aftermath {
        if (!this.instance) {
            this.instance = new Aftermath('MAINNET');
        }
        return this.instance;
    }
    static async getTokenAPR(tokenAddress: string): Promise<any> {
        try {
            const aftermath = this.getInstance();
            const apr = await aftermath.Prices()
            return apr;
        } catch (error: any) {
            return `Error fetching APR: ${error.message}`;
        }
    }
}

export const getTokenAPR = AftermathTool.getTokenAPR.bind(AftermathTool);
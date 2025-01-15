import {
  calculateUtilization,
  calculateLendingRate,
  getLendingRate,
} from "../src/yields/YieldAnalysis";

import { getPool } from "../src/markets/PriceAnalysis";

// Mock the AftermathClient's getPool function
jest.mock("../src/markets/PriceAnalysis", () => ({
  getPool: jest.fn().mockResolvedValue({
    id: "0x0000000000000000000000000000000000000000000000000000000000000123",
    reserves: ["1000000", "500000"],
  }),
}));

describe("Rates Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateUtilization", () => {
    it("should calculate correct utilization rate", () => {
      const borrowed = Number(500n);
      const supplied = Number(1000n);
      const utilization = calculateUtilization(borrowed, supplied);
      expect(utilization).toBe(0.5); // 500/1000 = 0.5
    });

    it("should return 0 when supplied is 0", () => {
      const utilization = calculateUtilization(Number(500n), 0);
      expect(utilization).toBe(0);
    });

    it("should handle large numbers", () => {
      const borrowed = Number(BigInt(1e9));
      const supplied = Number(BigInt(2e9));
      const utilization = calculateUtilization(borrowed, supplied);
      expect(utilization).toBe(0.5);
    });
  });

  describe("calculateLendingRate", () => {
    it("should calculate lending rate with default parameters", () => {
      const utilization = 0.5;
      const rate = calculateLendingRate(utilization);
      // baseRate + (multiplier * utilization)
      expect(rate).toBe(0.02 + 0.2 * 0.5);
    });

    it("should calculate lending rate with custom parameters", () => {
      const utilization = 0.7;
      const baseRate = 0.03;
      const multiplier = 0.3;
      const rate = calculateLendingRate(utilization, baseRate, multiplier);
      expect(rate).toBe(0.03 + 0.3 * 0.7);
    });

    it("should handle 0 utilization", () => {
      const rate = calculateLendingRate(0);
      expect(rate).toBe(0.02); // Just base rate
    });

    it("should handle 100% utilization", () => {
      const rate = calculateLendingRate(1);
      expect(rate).toBe(0.22); // baseRate + multiplier
    });
  });

  describe("getLendingRate", () => {
    const validPoolId =
      "0x0000000000000000000000000000000000000000000000000000000000000123";

    it("should get lending rate for a pool", async () => {
      const rate = await getLendingRate(validPoolId);
      expect(rate).toBeGreaterThan(0);
      expect(getPool).toHaveBeenCalledWith(validPoolId, undefined);
    });

    it("should use custom parameters", async () => {
      const rate = await getLendingRate(validPoolId, 0.03, 0.3);
      expect(rate).toBeGreaterThan(0);
    });

    it("should throw error if pool not found", async () => {
      const mockGetPool = getPool as jest.Mock;
      mockGetPool.mockResolvedValueOnce(null);

      await expect(getLendingRate(validPoolId)).rejects.toThrow(
        "Pool not found"
      );
    });

    it("should handle network parameter", async () => {
      await getLendingRate(validPoolId, 0.02, 0.2, "TESTNET");
      expect(getPool).toHaveBeenCalledWith(validPoolId, "TESTNET");
    });
  });
});

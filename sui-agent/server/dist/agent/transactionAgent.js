"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionAgent = void 0;
const client_1 = require("@mysten/sui.js/client");
const transactions_1 = require("@mysten/sui.js/transactions");
const config_1 = require("../common/config");
class TransactionAgent {
    constructor(network = "MAINNET") {
        this.client = new client_1.SuiClient({ url: config_1.NETWORK_CONFIG[network].fullnode });
    }
    /**
     * Creates a transaction block for transferring SUI
     */
    buildTransferTx(amount, recipient) {
        const tx = new transactions_1.TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
        tx.transferObjects([coin], tx.pure(recipient));
        return tx;
    }
    /**
     * Creates a transaction block for merging coins
     */
    buildMergeCoinsTx(destinationCoin, sourceCoins) {
        const tx = new transactions_1.TransactionBlock();
        tx.mergeCoins(tx.object(destinationCoin), sourceCoins.map((coin) => tx.object(coin)));
        return tx;
    }
    /**
     * Creates a transaction block for a Move call
     */
    buildMoveCallTx(target, typeArguments, args) {
        const tx = new transactions_1.TransactionBlock();
        tx.moveCall({
            target,
            typeArguments,
            arguments: args.map((arg) => {
                if (typeof arg === "string" && arg.startsWith("0x")) {
                    return tx.object(arg);
                }
                return tx.pure(arg);
            }),
        });
        return tx;
    }
    /**
     * Creates a sponsored transaction
     */
    createSponsoredTx(tx, sender, sponsor, sponsorCoins) {
        return __awaiter(this, void 0, void 0, function* () {
            const kindBytes = yield tx.build({ onlyTransactionKind: true });
            const sponsoredTx = transactions_1.TransactionBlock.fromKind(kindBytes);
            sponsoredTx.setSender(sender);
            sponsoredTx.setGasOwner(sponsor);
            sponsoredTx.setGasPayment(sponsorCoins);
            return sponsoredTx;
        });
    }
    /**
     * Creates a vector of objects for move calls
     */
    createMoveVec(tx, elements, type) {
        return tx.makeMoveVec({
            objects: elements,
            type,
        });
    }
    /**
     * Estimates gas for a transaction
     */
    estimateGas(tx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dryRunResult = yield this.client.dryRunTransactionBlock({
                    transactionBlock: tx.serialize(),
                });
                return BigInt(dryRunResult.effects.gasUsed.computationCost);
            }
            catch (error) {
                console.error("Error estimating gas:", error);
                // Return a default gas estimate if dry run fails
                return BigInt(2000000);
            }
        });
    }
    /**
     * Waits for a transaction to be confirmed
     */
    waitForTransaction(digest) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.waitForTransactionBlock({
                digest,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });
        });
    }
    /**
     * Gets all coins owned by an address
     */
    getCoins(owner) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.client.getCoins({
                owner,
            });
            return data;
        });
    }
    /**
     * Gets coin balances for an address
     */
    getBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const balance = yield this.client.getBalance({
                owner: address,
                coinType: "0x2::sui::SUI",
            });
            return {
                totalBalance: BigInt(balance.totalBalance),
            };
        });
    }
}
exports.TransactionAgent = TransactionAgent;

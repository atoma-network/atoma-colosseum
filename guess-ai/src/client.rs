use std::str::FromStr;

use sui_sdk::{
    json::SuiJsonValue,
    types::{
        base_types::{ObjectID, ObjectIDParseError, SuiAddress},
        error::SuiError,
    },
    wallet_context::WalletContext,
};
use tracing::{error, info, instrument};
use x25519_dalek::PublicKey;

use crate::GUESS_AI_MODULE_NAME;

/// The gas budget for the node registration transaction
const GAS_BUDGET: u64 = 50_000_000; // 0.05 SUI

/// The name of the function to withdraw funds from the treasury pool
const WITHDRAW_FUNDS_FROM_TREASURY_POOL_FUNCTION_NAME: &str = "withdraw_funds_from_treasury_pool";

/// The name of the function to submit the node public key
const RESUBMIT_TDX_ATTESTATION_FUNCTION_NAME: &str = "resubmit_tdx_attestation";

/// The result type for the Sui client
type Result<T> = std::result::Result<T, SuiClientError>;

/// The context for the Sui client to interact with the
/// GuessAI game smart contract, on the Sui blockchain.
pub struct SuiClientContext {
    /// The ID of the Secret Guessing database object
    guess_ai_db: ObjectID,

    /// The ID of the Secret Guessing package
    guess_ai_package_id: ObjectID,

    /// The wallet context for the current Sui client
    wallet_context: WalletContext,
}

impl SuiClientContext {
    /// Constructor
    pub fn new(
        guess_ai_db: ObjectID,
        guess_ai_package_id: ObjectID,
        wallet_context: WalletContext,
    ) -> Self {
        Self {
            guess_ai_db,
            guess_ai_package_id,
            wallet_context,
        }
    }

    #[instrument(
        level = "info",
        skip_all,
        fields(
            public_key = ?public_key,
        )
    )]
    pub async fn submit_node_public_key(
        &mut self,
        public_key: PublicKey,
        tdx_quote_bytes: Vec<u8>,
        gas: Option<ObjectID>,
        gas_budget: Option<u64>,
        gas_price: Option<u64>,
    ) -> Result<String> {
        let client = self.wallet_context.get_client().await?;
        let active_address = self.wallet_context.active_address()?;

        let tx = client
            .transaction_builder()
            .move_call(
                active_address,
                self.guess_ai_package_id,
                GUESS_AI_MODULE_NAME,
                RESUBMIT_TDX_ATTESTATION_FUNCTION_NAME,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::new(public_key.to_bytes().into())?,
                    SuiJsonValue::new(tdx_quote_bytes.into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Withdraws funds from the treasury pool and transfers them to the specified winner address.
    ///
    /// This method executes a Move call to withdraw funds from the Secret Guessing game's treasury pool
    /// and transfer them to the winning player's address.
    ///
    /// # Arguments
    ///
    /// * `winner_address` - The Sui address of the winning player who will receive the funds
    /// * `gas` - Optional ObjectID to use for gas payment. If None, the system will select an appropriate gas object
    /// * `gas_budget` - Optional gas budget for the transaction. Defaults to 50,000,000 (0.05 SUI) if None
    /// * `gas_price` - Optional gas price for the transaction. If None, the system will use the network's reference price
    ///
    /// # Returns
    ///
    /// Returns a `Result<String>` containing the transaction digest if successful, or a `SuiClientError` if the operation fails
    ///
    /// # Errors
    ///
    /// This function will return an error if:
    /// * The wallet context fails to get the active address
    /// * The object ID parsing fails
    /// * The transaction execution fails
    #[instrument(
        level = "info",
        skip_all,
        fields(
            winner_address = %winner_address,
        )
    )]
    pub async fn withdraw_funds_from_treasury_pool(
        &mut self,
        winner_address: SuiAddress,
        gas: Option<ObjectID>,
        gas_budget: Option<u64>,
        gas_price: Option<u64>,
    ) -> Result<String> {
        let client = self.wallet_context.get_client().await?;
        let active_address = self.wallet_context.active_address()?;

        let tx = client
            .transaction_builder()
            .move_call(
                active_address,
                self.guess_ai_package_id,
                GUESS_AI_MODULE_NAME,
                WITHDRAW_FUNDS_FROM_TREASURY_POOL_FUNCTION_NAME,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(ObjectID::from_str(
                        winner_address.to_string().as_str(),
                    )?),
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-withdraw-funds-from-treasury-pool",
            tx_hash = %tx.digest(),
            winner_address = %winner_address,
            "Withdrew funds from treasury pool for winner"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        info!(
            target = "sui-client-withdraw-funds-from-treasury-pool",
            tx_hash = %response.digest,
            "Successfully withdrew funds from treasury pool for winner"
        );

        Ok(response.digest.to_string())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SuiClientError {
    #[error("Failed to get active address")]
    GetActiveAddressError(#[from] SuiError),
    #[error("Failed to parse object ID")]
    ParseObjectIDError(#[from] ObjectIDParseError),
    #[error("Failed to withdraw funds from treasury pool")]
    WithdrawFundsFromTreasuryPoolError(#[from] anyhow::Error),
}

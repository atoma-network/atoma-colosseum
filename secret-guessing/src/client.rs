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

use crate::SECRET_GUESSING_MODULE_NAME;

/// The gas budget for the node registration transaction
const GAS_BUDGET: u64 = 50_000_000; // 0.05 SUI

/// The name of the function to withdraw funds from the treasury pool
const WITHDRAW_FUNDS_FROM_TREASURY_POOL_FUNCTION_NAME: &str = "withdraw_funds_from_treasury_pool";

/// The result type for the Sui client
type Result<T> = std::result::Result<T, SuiClientError>;

pub struct SuiClientContext {
    /// The ID of the Secret Guessing database object
    secret_guessing_db: ObjectID,

    /// The ID of the Secret Guessing package
    secret_guessing_package_id: ObjectID,

    /// The wallet context for the current Sui client
    wallet_context: WalletContext,
}

impl SuiClientContext {
    /// Constructor
    pub fn new(
        secret_guessing_db: ObjectID,
        secret_guessing_package_id: ObjectID,
        wallet_context: WalletContext,
    ) -> Self {
        Self {
            secret_guessing_db,
            secret_guessing_package_id,
            wallet_context,
        }
    }

    #[instrument(
    level = "info"
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
    ) -> Result<()> {
        let client = self.wallet_context.get_client().await?;
        let active_address = self.wallet_context.active_address()?;

        let tx = client
            .transaction_builder()
            .move_call(
                active_address,
                self.secret_guessing_package_id,
                SECRET_GUESSING_MODULE_NAME,
                WITHDRAW_FUNDS_FROM_TREASURY_POOL_FUNCTION_NAME,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.secret_guessing_db),
                    SuiJsonValue::from_object_id(ObjectID::from_str(
                        winner_address.to_string().as_str(),
                    )?),
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        Ok(())
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

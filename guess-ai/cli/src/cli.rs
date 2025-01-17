use anyhow::Result;
use sui_sdk::{json::SuiJsonValue, types::base_types::ObjectID, wallet_context::WalletContext};
use tracing::{info, instrument};

/// The Atoma contract db module name.
const GUESS_AI_MODULE_NAME: &str = "guess_ai";

/// The gas budget for the node registration transaction
const GAS_BUDGET: u64 = 50_000_000; // 0.05 SUI

/// Set the fee rate increase per guess per milli
const SET_FEE_RATE_INCREASE_COMMAND: &str = "set_fee_rate_increase_per_guess_per_mille";

/// Set the game inactive
const SET_GAME_INACTIVE_COMMAND: &str = "set_game_inactive";

/// Set the agent address
const SET_AGENT_ADDRESS_COMMAND: &str = "set_agent_address";

/// Set the starting fee for the game
const SET_STARTING_FEE_COMMAND: &str = "set_starting_fee";

/// Set the fee update interval in guesses
const SET_UPDATE_FEE_EVERY_N_GUESSES_COMMAND: &str = "set_update_fee_every_n_guesses";

/// Set the protocol fee per mille
const SET_PROTOCOL_FEE_PER_MILLE_COMMAND: &str = "set_protocol_fee_per_mille";

/// The context for the Sui client to interact with the
/// GuessAI game smart contract, on the Sui blockchain.
pub struct SuiClientContext {
    /// The ID of the Secret Guessing database object
    guess_ai_db: ObjectID,

    /// The ID of the GuessAI manager
    guess_ai_manager_id: ObjectID,

    /// The ID of the Secret Guessing package
    guess_ai_package_id: ObjectID,

    /// The wallet context for the current Sui client
    wallet_context: WalletContext,
}

impl SuiClientContext {
    /// Constructor
    pub fn new(
        guess_ai_db: ObjectID,
        guess_ai_manager_id: ObjectID,
        guess_ai_package_id: ObjectID,
        wallet_context: WalletContext,
    ) -> Self {
        Self {
            guess_ai_db,
            guess_ai_manager_id,
            guess_ai_package_id,
            wallet_context,
        }
    }

    /// Sets the fee rate increase per guess per mille.
    ///
    /// # Arguments
    /// * `fee_rate_increase_per_guess_per_mille` - The fee rate increase per guess per mille
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    #[instrument(
        level = "info",
        name = "set_fee_rate_increase_per_guess_per_mille",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_fee_rate_increase_per_guess_per_mille(
        &mut self,
        fee_rate_increase_per_guess_per_mille: u64,
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
                SET_FEE_RATE_INCREASE_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                    SuiJsonValue::new(fee_rate_increase_per_guess_per_mille.to_string().into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-fee-rate-increase-per-guess-per-mille",
            tx_hash = %tx.digest(),
            "Set fee rate increase per guess per mille"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Sets the game inactive.
    ///
    /// # Arguments
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    /// let tx_digest = client.set_game_inactive(None, None, None).await?;
    /// ```
    #[instrument(
        level = "info",
        name = "set_game_inactive",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_game_inactive(
        &mut self,
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
                SET_GAME_INACTIVE_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-game-inactive",
            tx_hash = %tx.digest(),
            "Set game inactive"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Sets the agent address for the GuessAI game.
    ///
    /// # Arguments
    /// * `agent_address` - The address of the agent
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    /// let tx_digest = client.set_agent_address(agent_address, None, None, None).await?;
    /// ```
    #[instrument(
        level = "info",
        name = "set_agent_address",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_agent_address(
        &mut self,
        agent_address: String,
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
                SET_AGENT_ADDRESS_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                    SuiJsonValue::new(agent_address.into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-agent-address",
            tx_hash = %tx.digest(),
            "Set agent address"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Sets the starting fee for the GuessAI game.     
    ///
    /// # Arguments
    /// * `starting_fee` - The starting fee for the game
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    /// let tx_digest = client.set_starting_fee(100, None, None, None).await?;
    /// ```
    #[instrument(
        level = "info",
        name = "set_starting_fee",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_starting_fee(
        &mut self,
        starting_fee: u64,
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
                SET_STARTING_FEE_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                    SuiJsonValue::new(starting_fee.to_string().into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-starting-fee",
            tx_hash = %tx.digest(),
            "Set starting fee"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Sets the fee update interval in guesses for the GuessAI game.
    ///
    /// # Arguments
    /// * `update_fee_every_n_guesses` - The number of guesses between fee updates
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    /// let tx_digest = client.set_update_fee_every_n_guesses(100, None, None, None).await?;
    /// ```
    #[instrument(
        level = "info",
        name = "set_update_fee_every_n_guesses",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_update_fee_every_n_guesses(
        &mut self,
        update_fee_every_n_guesses: u64,
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
                SET_UPDATE_FEE_EVERY_N_GUESSES_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                    SuiJsonValue::new(update_fee_every_n_guesses.to_string().into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-update-fee-every-n-guesses",
            tx_hash = %tx.digest(),
            "Set update fee every n guesses"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }

    /// Sets the protocol fee rate in per mille (parts per thousand) for the GuessAI game.
    ///
    /// # Arguments
    /// * `protocol_fee_per_mille` - The protocol fee rate in per mille (e.g., 50 = 5%)
    /// * `gas` - Optional gas object ID to use for the transaction
    /// * `gas_budget` - Optional gas budget for the transaction (defaults to GAS_BUDGET)
    /// * `gas_price` - Optional gas price for the transaction
    ///
    /// # Returns
    /// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
    ///
    /// # Example
    /// ```rust,ignore
    /// let tx_digest = client.set_protocol_fee_per_mille(50, None, None, None).await?;
    /// ```
    #[instrument(
        level = "info",
        name = "set_protocol_fee_per_mille",
        skip_all,
        fields(
            active_address = %self.wallet_context.active_address()?,
        )
    )]
    pub async fn set_protocol_fee_per_mille(
        &mut self,
        protocol_fee_per_mille: u64,
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
                SET_PROTOCOL_FEE_PER_MILLE_COMMAND,
                vec![],
                vec![
                    SuiJsonValue::from_object_id(self.guess_ai_db),
                    SuiJsonValue::from_object_id(self.guess_ai_manager_id),
                    SuiJsonValue::new(protocol_fee_per_mille.to_string().into())?,
                ],
                gas,
                gas_budget.unwrap_or(GAS_BUDGET),
                gas_price,
            )
            .await?;

        info!(
            target = "sui-client-set-protocol-fee-per-mille",
            tx_hash = %tx.digest(),
            "Set protocol fee per mille"
        );

        let tx = self.wallet_context.sign_transaction(&tx);
        let response = self
            .wallet_context
            .execute_transaction_must_succeed(tx)
            .await;

        Ok(response.digest.to_string())
    }
}

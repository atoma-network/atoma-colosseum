use crate::config::SecretGuessingConfig;
use std::time::Duration;
use sui_sdk::{SuiClient, SuiClientBuilder};
use thiserror::Error;
use tracing::{info, instrument};

/// The Atoma contract db module name.
const SECRET_GUESSING_MODULE_NAME: &str = "secret_guessing";

/// The duration to wait for new events in seconds, if there are no new events.
const DURATION_TO_WAIT_FOR_NEW_EVENTS_IN_MILLIS: u64 = 100;

pub(crate) type Result<T> = std::result::Result<T, SuiEventSubscriberError>;

/// A subscriber for Sui blockchain events.
///
/// This struct provides functionality to subscribe to and process events
/// from the Sui blockchain based on specified filters.
pub struct SuiEventSubscriber {
    pub config: SecretGuessingConfig,
}

impl SuiEventSubscriber {
    /// Constructor
    pub fn new(config: SecretGuessingConfig) -> Self {
        Self { config }
    }

    /// Builds a SuiClient based on the provided configuration.
    ///
    /// This asynchronous method creates a new SuiClient instance using the settings
    /// specified in the AtomaSuiConfig. It sets up the client with the
    /// configured request timeout and HTTP RPC node address.
    ///
    /// # Arguments
    ///
    /// * `config` - A reference to a AtomaSuiConfig containing the necessary
    ///              configuration parameters.
    ///
    /// # Returns
    ///
    /// * `Result<SuiClient>` - A Result containing the newly created SuiClient if successful,
    ///                         or a SuiEventSubscriberError if the client creation fails.
    ///
    /// # Errors
    ///
    /// This function will return an error if:
    /// * The SuiClient cannot be built with the provided configuration.
    /// * There's a network issue when connecting to the specified RPC node.
    #[instrument(level = "info", skip_all, fields(
        http_rpc_node_addr = %config.http_rpc_node_addr
    ))]
    pub async fn build_client(config: &SecretGuessingConfig) -> Result<SuiClient> {
        let mut client_builder = SuiClientBuilder::default();
        if let Some(request_timeout) = config.request_timeout {
            client_builder = client_builder.request_timeout(Duration::from_millis(request_timeout));
        }
        let client = client_builder.build(config.http_rpc_node_addr).await?;
        info!(
            target: "sui_event_subscriber",
            "Client built successfully"
        );
        Ok(client)
    }

    pub fn run(&self) -> Result<()> {
        Ok(())
    }
}

#[derive(Debug, Error)]
pub enum SuiEventSubscriberError {
    #[error("Failed to read events: {0}")]
    ReadEventsError(#[from] sui_sdk::error::Error),
    #[error("Failed to parse event: {0}")]
    SuiEventParseError(#[from] SuiEventParseError),
    #[error("Failed to deserialize event: {0}")]
    DeserializeError(#[from] serde_json::Error),
    #[error("Failed to send compute units to state manager")]
    SendComputeUnitsError,
    #[error("Failed to read/write cursor to file: {0}")]
    CursorFileError(#[from] std::io::Error),
    #[error("Failed to serialize cursor: {0}")]
    SerializeCursorError(#[from] toml::ser::Error),
    #[error("Failed to deserialize cursor: {0}")]
    DeserializeCursorError(#[from] toml::de::Error),
}

pub(crate) mod events {
    use serde::{Deserialize, Serialize};
    use std::str::FromStr;

    /// The Secret Guessing contract events
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) enum SecretGuessingEvent {
        PublishEvent(PublishEvent),
        NewGuessEvent(NewGuessEvent),
        RotateTdxQuoteEvent(RotateTdxQuoteEvent),
        TDXQuoteResubmittedEvent(TDXQuoteResubmittedEvent),
    }

    /// Event emitted when a new event is published
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct PublishEvent {
        /// The ID of the initialized shared object, underlying the smart contract
        pub(crate) id: String,

        /// The ID of the manager that published the event
        pub(crate) manager_id: String,
    }

    /// Event emitted when a new guess is made
    ///
    /// This struct represents the event data for when a new guess is made, which includes
    /// the fee paid for the guess, the guess itself, the guess count, and the treasury pool balance.
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct NewGuessEvent {
        /// The fee paid for the guess
        #[serde(deserialize_with = "deserialize_string_to_u64")]
        pub(crate) fee: u64,

        /// The guess itself
        pub(crate) guess: String,

        /// The guess count
        #[serde(deserialize_with = "deserialize_string_to_u64")]
        pub(crate) guess_count: u64,

        /// The treasury pool balance
        pub(crate) treasury_pool_balance: u64,
    }

    /// Event emitted when a new TDX quote rotation occurs
    ///
    /// This struct represents the event data for when the TEE (Trusted Execution Environment)
    /// rotates its TDX quote, which includes a new epoch number and challenge nonce.

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct RotateTdxQuoteEvent {
        /// The epoch number for the new TDX quote rotation
        #[serde(deserialize_with = "deserialize_string_to_u64")]
        pub(crate) epoch: u64,

        /// The challenge nonce for the new TDX quote rotation
        pub(crate) challenge_nonce: Vec<u8>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct TDXQuoteResubmittedEvent {
        epoch: u64,
        tdx_quote_v4: Vec<u8>,
    }

    /// Deserializes a string representation of a number into a numeric type that implements FromStr.
    ///
    /// This function is used as a custom deserializer for serde, primarily to handle string-encoded
    /// numbers in JSON that need to be converted to numeric types.
    ///
    /// # Type Parameters
    /// * `D` - The deserializer type from serde
    /// * `T` - The target numeric type that implements FromStr
    ///
    /// # Arguments
    /// * `deserializer` - The deserializer instance
    ///
    /// # Returns
    /// * `Result<T, D::Error>` - The parsed numeric value or a deserialization error
    ///
    /// # Example
    /// ```
    /// #[derive(Deserialize)]
    /// struct MyStruct {
    ///     #[serde(deserialize_with = "deserialize_string_to_u64")]
    ///     value: u64,
    /// }
    /// ```
    fn deserialize_string_to_u64<'de, D, T>(deserializer: D) -> std::result::Result<T, D::Error>
    where
        D: serde::de::Deserializer<'de>,
        T: FromStr,
        T::Err: std::fmt::Display,
    {
        let s = String::deserialize(deserializer)?;
        s.parse::<T>().map_err(serde::de::Error::custom)
    }
}

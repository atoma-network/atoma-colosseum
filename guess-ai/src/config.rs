use std::path::Path;

use config::Config;
use serde::{Deserialize, Serialize};

/// Configuration for the Secret Guessing application
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GuessAiConfig {
    /// API key for Atoma service authentication
    pub atoma_api_key: String,

    /// Twitter consumer key
    pub twitter_consumer_key: String,

    /// Twitter consumer secret
    pub twitter_consumer_secret: String,

    /// Twitter access token
    pub twitter_access_token: String,

    /// Twitter access token secret
    pub twitter_access_token_secret: String,

    /// File path for storing cursor information
    pub cursor_path: String,

    /// The number of consecutive guesses to wait before providing a new hint
    pub hint_wait_count: u64,

    /// HTTP address of the RPC node
    pub http_rpc_node_addr: String,

    /// The model to use for the Atoma service
    pub model: String,

    /// Limit for the number of events to fetch per request
    pub limit: Option<usize>,

    /// Package identifier for the smart contract
    pub guess_ai_package_id: String,

    /// Database identifier for the smart contract
    pub guess_ai_db: String,

    /// Optional timeout duration for requests in seconds
    pub request_timeout: Option<u64>,

    /// Maximum number of concurrent requests to the Sui RPC node
    pub max_concurrent_requests: Option<usize>,

    /// Sui's config path
    pub sui_config_path: String,
}

impl GuessAiConfig {
    /// Creates a new `GuessAiConfig` instance from a configuration file path.
    ///
    /// This method loads configuration values from two sources:
    /// 1. A configuration file specified by `config_file_path`
    /// 2. Environment variables prefixed with `GUESS_AI__`
    ///
    /// Environment variables take precedence over file configuration values.
    ///
    /// # Arguments
    ///
    /// * `config_file_path` - Path to the configuration file. Can be any type that implements `AsRef<Path>`.
    ///
    /// # Returns
    ///
    /// Returns a new `GuessAiConfig` instance.
    ///
    /// # Panics
    ///
    /// This method will panic if:
    /// * The configuration file cannot be read or parsed
    /// * The configuration values don't match the expected structure
    /// * The "guess_ai" section is missing from the configuration
    pub fn from_file_path<P: AsRef<Path>>(config_file_path: P) -> Self {
        let builder = Config::builder()
            .add_source(config::File::with_name(
                config_file_path.as_ref().to_str().unwrap(),
            ))
            .add_source(
                config::Environment::with_prefix("GUESS_AI")
                    .keep_prefix(true)
                    .separator("__"),
            );

        let config = builder
            .build()
            .expect("Failed to generate atoma state configuration file");
        config
            .get::<Self>("guess_ai")
            .expect("Failed to generate configuration instance")
    }
}

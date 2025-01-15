use serde::{Deserialize, Serialize};

/// Configuration for the Secret Guessing application
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SecretGuessingConfig {
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
    pub package_id: String,

    /// Optional timeout duration for requests in seconds
    pub request_timeout: Option<u64>,
}

use serde::{Deserialize, Serialize};

/// Configuration for the Secret Guessing application
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SecretGuessingConfig {
    /// API key for Atoma service authentication
    pub atoma_api_key: String,

    /// The maximum number of guesses allowed for the current game,
    /// if the number of guesses is greater than this value, the game will be over
    /// and the treasury funds will be distributed to the owner of the agent
    pub max_guesses: u64,

    /// File path for storing cursor information
    pub cursor_path: String,

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

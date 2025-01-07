use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SecretGuessingConfig {
    pub atoma_api_key: String,
    pub http_rpc_node_addr: String,
    pub request_timeout: Option<u64>,
}

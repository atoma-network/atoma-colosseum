use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateChatCompletionRequest {
    #[serde(flatten)]
    pub chat_completion_request: ChatCompletionRequest,

    /// Whether to stream back partial progress. Must be false for this request type.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateChatCompletionStreamRequest {
    #[serde(flatten)]
    pub chat_completion_request: ChatCompletionRequest,

    /// Whether to stream back partial progress. Must be true for this request type.
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    /// ID of the model to use
    pub model: String,

    /// A list of messages comprising the conversation so far
    pub messages: Vec<ChatCompletionMessage>,

    /// What sampling temperature to use, between 0 and 2
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,

    /// An alternative to sampling with temperature
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,

    /// How many chat completion choices to generate for each input message
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<i32>,

    /// Whether to stream back partial progress
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Up to 4 sequences where the API will stop generating further tokens
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Vec<String>>,

    /// The maximum number of tokens to generate in the chat completion
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<i32>,

    /// Number between -2.0 and 2.0. Positive values penalize new tokens based on
    /// whether they appear in the text so far
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,

    /// Number between -2.0 and 2.0. Positive values penalize new tokens based on their
    /// existing frequency in the text so far
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,

    /// Modify the likelihood of specified tokens appearing in the completion
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logit_bias: Option<std::collections::HashMap<String, f32>>,

    /// A unique identifier representing your end-user
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,

    /// A list of functions the model may generate JSON inputs for
    #[serde(skip_serializing_if = "Option::is_none")]
    pub functions: Option<Vec<Value>>,

    /// Controls how the model responds to function calls
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_call: Option<Value>,

    /// The format to return the response in
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<Value>,

    /// A list of tools the model may call
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<Value>>,

    /// Controls which (if any) tool the model should use
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,

    /// If specified, our system will make a best effort to sample deterministically
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionMessage {
    /// The role of the message author. One of: "system", "user", "assistant", "tool", or "function"
    pub role: String,

    /// The contents of the message
    pub content: String,

    /// The name of the author of this message
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    /// A unique identifier for the chat completion.
    pub id: String,

    /// The Unix timestamp (in seconds) of when the chat completion was created.
    pub created: i64,

    /// The model used for the chat completion.
    pub model: String,

    /// A list of chat completion choices.
    pub choices: Vec<ChatCompletionChoice>,

    /// Usage statistics for the completion request.
    pub usage: Option<CompletionUsage>,

    /// The system fingerprint for the completion, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_fingerprint: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionStreamResponse {
    /// The stream of chat completion chunks.
    pub data: ChatCompletionChunk,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionChoice {
    /// The index of this choice in the list of choices.
    pub index: i32,

    /// The chat completion message.
    pub message: ChatCompletionMessage,

    /// The reason the chat completion was finished.
    pub finish_reason: Option<String>,

    /// Log probability information for the choice, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionUsage {
    /// Number of tokens in the prompt.
    pub prompt_tokens: i32,

    /// Number of tokens in the completion.
    pub completion_tokens: i32,

    /// Total number of tokens used (prompt + completion).
    pub total_tokens: i32,
}

// For streaming responses
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionChunk {
    /// A unique identifier for the chat completion chunk.
    pub id: String,

    /// The Unix timestamp (in seconds) of when the chunk was created.
    pub created: i64,

    /// The model used for the chat completion.
    pub model: String,

    /// A list of chat completion chunk choices.
    pub choices: Vec<ChatCompletionChunkChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionChunkChoice {
    /// The index of this choice in the list of choices.
    pub index: i32,

    /// The chat completion delta message for streaming.
    pub delta: ChatCompletionChunkDelta,

    /// The reason the chat completion was finished, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionChunkDelta {
    /// The role of the message author, if present in this chunk.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// The content of the message, if present in this chunk.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// The function call information, if present in this chunk.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_call: Option<Value>,

    /// The tool calls information, if present in this chunk.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<Value>>,
}

/// A request for confidential computation that includes encrypted data and associated cryptographic parameters
#[derive(Debug, Deserialize, Serialize)]
pub struct ConfidentialComputeRequest {
    /// The encrypted payload that needs to be processed (base64 encoded)
    pub ciphertext: String,

    /// Unique identifier for the small stack being used
    pub stack_small_id: u64,

    /// Cryptographic nonce used for encryption (base64 encoded)
    pub nonce: String,

    /// Salt value used in key derivation (base64 encoded)
    pub salt: String,

    /// Client's public key for Diffie-Hellman key exchange (base64 encoded)
    pub client_dh_public_key: String,

    /// Node's public key for Diffie-Hellman key exchange (base64 encoded)
    pub node_dh_public_key: String,

    /// Hash of the original plaintext body for integrity verification (base64 encoded)
    pub plaintext_body_hash: String,

    /// Indicates whether this is a streaming request
    pub stream: Option<bool>,

    /// Model name
    pub model_name: String,

    /// Number of compute units to be used for the request, for image generations,
    /// as this value is known in advance (the number of pixels to generate)
    pub num_compute_units: Option<u64>,
}

/// Represents usage statistics for a confidential compute request
#[derive(Debug, Deserialize, Serialize)]
pub struct Usage {
    /// Number of compute units used
    pub prompt_tokens: u64,

    /// Number of compute units used
    /// NOTE: This is not used for the embeddings endpoint
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion_tokens: Option<u64>,

    /// Number of compute units used
    pub total_tokens: u64,

    /// Details about the completion tokens
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion_tokens_details: Option<Value>,
}

/// Represents a response from a confidential compute request
#[derive(Debug, Deserialize, Serialize)]
pub struct ConfidentialComputeResponse {
    /// Encrypted response body (base64 encoded)
    pub ciphertext: String,

    /// Nonce used for encryption (base64 encoded)
    pub nonce: String,

    /// Signature of the response body (base64 encoded)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,

    /// Hash of the response body (base64 encoded)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_hash: Option<String>,

    /// Usage statistics for the request
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

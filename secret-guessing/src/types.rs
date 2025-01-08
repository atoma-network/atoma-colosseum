use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A response from the Atoma API for a chat completion.
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

/// Usage statistics for a chat completion.
#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionUsage {
    /// Number of tokens in the prompt.
    pub prompt_tokens: i32,

    /// Number of tokens in the completion.
    pub completion_tokens: i32,

    /// Total number of tokens used (prompt + completion).
    pub total_tokens: i32,
}

/// A choice in a chat completions response
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

/// A message in a chat completion.
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

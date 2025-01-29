use serde_json::json;
use thiserror::Error;
use tracing::instrument;
use x25519_dalek::{PublicKey, StaticSecret};

use crate::{
    atoma::{AtomaSdk, AtomaSdkError},
    client::{SuiClientContext, SuiClientError},
    engine::prompts::SecretPromptResponse,
};

type Result<T> = std::result::Result<T, GenerateSecretError>;

/// Generates a new secret using AI completion while establishing a secure connection with the node.
///
/// This function performs the following steps:
/// 1. Submits the client's public key to the Sui network with a TDX quote for attestation
/// 2. Makes a confidential chat completion request to generate a secret
/// 3. Parses and returns the generated secret
///
/// # Arguments
///
/// * `atoma_sdk` - Reference to the Atoma SDK for making confidential AI completions
/// * `client_public_key` - The client's X25519 public key for secure communication
/// * `generate_secret_prompt` - The prompt text used to generate the secret
/// * `model` - The name/identifier of the AI model to use
/// * `sui_client_ctx` - Reference to the Sui client context for network operations
///
/// # Returns
///
/// Returns a `Result<String>` containing the generated secret if successful.
///
/// # Errors
///
/// This function can return the following errors:
/// * `GenerateSecretError::FailedToSubmitNodePublicKey` - If registering the public key with the network fails
/// * `GenerateSecretError::FailedToGenerateChatCompletions` - If the AI completion request fails
/// * `GenerateSecretError::FailedToParseSecretPromptResponse` - If parsing the AI response fails
///
/// # Instrumentation
///
/// This function is instrumented with tracing at info level, logging the prompt and model used.
#[instrument(
    level = "info",
    skip_all,
    fields(
        generate_secret_prompt = %generate_secret_prompt,
        model = %model,
    )
)]
pub async fn generate_new_secret(
    atoma_sdk: &AtomaSdk,
    client_private_key: &StaticSecret,
    generate_secret_prompt: String,
    model: String,
    random_seed: u64,
    sui_client_ctx: &mut SuiClientContext,
) -> Result<String> {
    let client_public_key = PublicKey::from(client_private_key);
    // let tdx_quote_bytes = tdx::generate_tdx_quote_bytes(&mut rng);
    // TODO: Remove this once we have a real TDX quote
    let tdx_quote_bytes = vec![0; 32];
    sui_client_ctx
        .submit_node_public_key(client_public_key, tdx_quote_bytes, None, None, None)
        .await?;

    let chat_completions_request = serde_json::from_value(json!({
        "model": model,
        "messages": [
            {"role": "system", "content": generate_secret_prompt},
        ],
        "seed": random_seed,
    }))?;

    let response_body = atoma_sdk
        .confidential_chat_completions(&client_private_key, chat_completions_request)
        .await?;

    let secret = serde_json::from_str::<SecretPromptResponse>(
        &response_body.choices[0].message.content.clone(),
    )?;

    Ok(secret.secret)
}

#[derive(Error, Debug)]
pub enum GenerateSecretError {
    #[error("Failed to submit node public key")]
    FailedToSubmitNodePublicKey(#[from] SuiClientError),

    #[error("Failed to generate chat completions")]
    FailedToGenerateChatCompletions(#[from] AtomaSdkError),

    #[error("Failed to parse secret prompt response")]
    FailedToParseSecretPromptResponse(#[from] serde_json::Error),
}

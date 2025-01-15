use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit};
use base64::engine::{general_purpose::STANDARD, Engine};
use hkdf::Hkdf;
use rand::Rng;
use serde::Deserialize;
use sha2::Sha256;
use thiserror::Error;
use tracing::{error, info, instrument};
use x25519_dalek::{PublicKey, StaticSecret};

use crate::types::{
    ChatCompletionRequest, ChatCompletionResponse, ConfidentialComputeRequest,
    ConfidentialComputeResponse,
};

/// The header key for the authorization header
const AUTHORIZATION: &str = "Authorization";

/// The size of the payload hash in bytes
const PAYLOAD_HASH_SIZE: usize = 32;

/// The size of the public key in bytes
const PUBLIC_KEY_SIZE: usize = 32;

/// The maximum number of compute units to be used for the request
const MAX_COMPUTE_UNITS: u64 = 8_192;

/// The size of the nonce in bytes
const NONCE_SIZE: usize = 12;

/// The size of the salt in bytes
const SALT_SIZE: usize = 16;

/// The result type for the Atoma SDK
type Result<T> = std::result::Result<T, AtomaSdkError>;

/// The response structure for the nodes/models/retrieve endpoint
#[derive(Debug, Deserialize)]
struct NodesModelsRetrieveResponse {
    /// The shared secret public key for the node, base64 encoded
    public_key: String,

    /// The small ID of the node
    #[allow(unused)]
    node_small_id: u64,

    /// The stack entry digest for the node
    #[allow(unused)]
    stack_entry_digest: Option<String>,

    /// The small ID of the stack for the node
    stack_small_id: u64,
}

/// AtomaSdk provides an interface for interacting with the Atoma API
///
/// This struct holds the necessary credentials and configuration
/// for making requests to the Atoma service.
pub struct AtomaSdk {
    /// API key used for authentication with the Atoma service
    api_key: String,
    /// The model identifier to be used for API requests
    model: String,
}

impl AtomaSdk {
    /// Constructor
    pub fn new(api_key: String, model: String) -> Self {
        Self { api_key, model }
    }

    /// Requests the public URL and associated information for a node from the Atoma API
    ///
    /// This method makes an authenticated GET request to the Atoma API to retrieve
    /// information about a specific node model, including its public key and
    /// various identifiers.
    ///
    /// # Returns
    ///
    /// Returns a `Result` containing a `NodesModelsRetrieveResponse` with the following information:
    /// - `public_key`: The shared secret public key for the node
    /// - `node_small_id`: The small ID of the node
    /// - `stack_entry_digest`: Optional stack entry digest
    /// - `stack_small_id`: The small ID of the stack for the node
    ///
    /// # Errors
    ///
    /// Returns `AtomaSdkError::RequestNodePublicUrlError` if:
    /// - The HTTP request fails
    /// - The server returns a non-success status code
    ///
    /// Returns `AtomaSdkError::ParseResponseError` if:
    /// - The response cannot be parsed into the expected format
    #[instrument(
        level = "info",
        name = "request_node_public_url",
        skip(self),
        fields(
            model = self.model,
        )
    )]
    pub async fn request_node_public_url(&self) -> Result<NodesModelsRetrieveResponse> {
        let client = reqwest::Client::new();
        let response = client
            .get(format!(
                "https://api.atoma.network/v1/nodes/models/{}",
                self.model
            ))
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .send()
            .await?;

        info!(
            target = "atoma-client",
            method = "GET",
            handle = "/v1/nodes/models/{}",
            model = self.model,
            "Response: {:?}",
            response
        );

        if !response.status().is_success() {
            return Err(AtomaSdkError::RequestNodePublicUrlError(
                response.error_for_status().unwrap_err(),
            ));
        }

        Ok(response.json::<NodesModelsRetrieveResponse>().await?)
    }

    /// Sends an encrypted chat completion request to the Atoma API with end-to-end encryption
    ///
    /// This method provides a secure way to interact with the chat completion API by:
    /// 1. Retrieving the node's public key
    /// 2. Establishing a shared secret using Diffie-Hellman key exchange
    /// 3. Encrypting the request with AES-GCM
    /// 4. Verifying the response's integrity and authenticity
    ///
    /// # Arguments
    ///
    /// * `client_private_key` - The client's X25519 private key for establishing the shared secret
    /// * `request` - The chat completion request to be encrypted and sent
    ///
    /// # Returns
    ///
    /// Returns a `Result` containing the decrypted `ChatCompletionResponse` if successful.
    ///
    /// # Errors
    ///
    /// Returns `AtomaSdkError` if:
    /// - Failed to retrieve node's public URL
    /// - Failed to decode the node's public key
    /// - Failed to encrypt the request
    /// - HTTP request failed
    /// - Failed to decrypt the response
    /// - Response signature verification failed
    ///
    /// # Security
    ///
    /// This method implements several security measures:
    /// - End-to-end encryption using AES-GCM
    /// - Perfect forward secrecy via ephemeral key exchange
    /// - Response integrity verification via hashing
    /// - Response authenticity verification via signatures
    #[instrument(
        level = "info",
        name = "confidential/chat/completions",
        skip_all,
        fields(
            model = self.model,
        )
    )]
    pub async fn confidential_chat_completions(
        &self,
        client_private_key: &StaticSecret,
        request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse> {
        let NodesModelsRetrieveResponse {
            public_key,
            stack_small_id,
            ..
        } = self.request_node_public_url().await?;
        let node_public_key = STANDARD.decode(public_key)?;
        let nonce = rand::thread_rng().gen::<[u8; NONCE_SIZE]>();
        let salt = rand::thread_rng().gen::<[u8; SALT_SIZE]>();

        let node_public_key_bytes: [u8; PUBLIC_KEY_SIZE] =
            node_public_key.try_into().map_err(|npk: Vec<u8>| {
                AtomaSdkError::CreatePublicKeyError(format!(
                    "Failed to convert public key, expected length is 32, received: {} ?",
                    npk.len()
                ))
            })?;
        let node_public_key = PublicKey::from(node_public_key_bytes);
        let confidential_compute_request = utils::encrypt_chat_completions_request(
            request,
            client_private_key,
            &node_public_key,
            self.model.clone(),
            nonce,
            salt,
            stack_small_id,
        )?;

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.atoma.network/v1/confidential/chat/completions")
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .json(&confidential_compute_request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AtomaSdkError::RequestNodePublicUrlError(
                response.error_for_status().unwrap_err(),
            ));
        }

        let ConfidentialComputeResponse {
            ciphertext,
            nonce,
            signature,
            response_hash,
            ..
        } = response.json::<ConfidentialComputeResponse>().await?;
        let response_ciphertext = STANDARD.decode(ciphertext)?;
        let nonce = STANDARD.decode(nonce)?;
        let nonce = nonce.try_into().map_err(|n: Vec<u8>| {
            AtomaSdkError::InvalidNonceError(format!(
                "Failed to decode nonce, length is not 12, it is: {}",
                n.len()
            ))
        })?;
        let response_hash = response_hash
            .as_ref()
            .map(|s| STANDARD.decode(s))
            .transpose()?
            .map(|s| s.try_into())
            .transpose()
            .map_err(|_| AtomaSdkError::InvalidPayloadHashLengthError)?;
        let response_body = utils::decrypt_chat_completions_response(
            response_ciphertext,
            client_private_key,
            &node_public_key,
            nonce,
            salt,
        )?;
        utils::verify_response_hash_and_signature(
            &response_body,
            response_hash,
            signature.as_ref().map(|s| s.as_str()),
        )?;
        Ok(response_body)
    }
}

#[derive(Debug, Error)]
pub enum AtomaSdkError {
    #[error("Failed to correctly parse public key: `{0}`")]
    CreatePublicKeyError(String),

    #[error("Failed to decode node public key: `{0}`")]
    DecodeNodePublicKeyError(#[from] base64::DecodeError),

    #[error("Failed to decrypt response: `{0}`")]
    DecryptResponseError(String),

    #[error("Failed to encrypt request: `{0}`")]
    EncryptRequestError(String),

    #[error("Invalid payload hash length")]
    InvalidPayloadHashLengthError,

    #[error("Invalid nonce length: `{0}`")]
    InvalidNonceError(String),

    #[error("Failed to expand key: `{0}`")]
    KeyExpansionFailed(#[from] hkdf::InvalidLength),

    #[error("Failed to parse response: `{0}`")]
    ParseResponseError(#[from] serde_json::Error),

    #[error("Failed to request node public URL: `{0}`")]
    RequestNodePublicUrlError(#[from] reqwest::Error),

    #[error("Failed to verify response hash and signature: `{0}`")]
    VerifyResponseHashAndSignatureError(String),
}

pub(crate) mod utils {
    use std::str::FromStr;

    use super::*;
    use blake2::{
        digest::generic_array::{typenum::U32, GenericArray},
        Blake2b, Digest,
    };
    use fastcrypto::{
        ed25519::{Ed25519PublicKey, Ed25519Signature},
        secp256k1::{Secp256k1PublicKey, Secp256k1Signature},
        secp256r1::{Secp256r1PublicKey, Secp256r1Signature},
        traits::{ToFromBytes, VerifyingKey},
    };
    use sui_sdk::types::crypto::{
        PublicKey as SuiPublicKey, Signature, SignatureScheme, SuiSignature,
    };

    /// Computes a Blake2b hash of the input data
    ///
    /// # Arguments
    /// * `slice` - A byte slice containing the data to be hashed
    ///
    /// # Returns
    /// A 32-byte [`GenericArray`] containing the computed hash
    ///
    /// # Example
    /// ```rust,ignore
    /// use atoma_utils::hashing::blake2b_hash;
    ///
    /// let data = b"Hello, world!";
    /// let hash = blake2b_hash(data);
    /// ```
    pub(crate) fn blake2b_hash(slice: &[u8]) -> GenericArray<u8, U32> {
        let mut hasher = Blake2b::new();
        hasher.update(slice);
        hasher.finalize()
    }

    #[instrument(
        level = "info",
        name = "encrypt_chat_completions_request",
        skip_all,
        fields(
            model = model_name,
            stack_small_id = stack_small_id,
        )
    )]
    pub(crate) fn encrypt_chat_completions_request(
        request: ChatCompletionRequest,
        client_private_key: &StaticSecret,
        node_public_key: &PublicKey,
        model_name: String,
        nonce: [u8; NONCE_SIZE],
        salt: [u8; SALT_SIZE],
        stack_small_id: u64,
    ) -> Result<ConfidentialComputeRequest> {
        let shared_secret = client_private_key.diffie_hellman(&node_public_key);

        let hkdf = Hkdf::<Sha256>::new(Some(&salt), shared_secret.as_bytes());
        let mut symmetric_key = [0u8; 32];
        hkdf.expand(b"", &mut symmetric_key)?;

        let cipher = Aes256Gcm::new(&symmetric_key.into());
        let ciphertext = cipher
            .encrypt(&nonce.into(), serde_json::to_vec(&request)?.as_slice())
            .map_err(|e| AtomaSdkError::EncryptRequestError(e.to_string()))?;
        let payload_hash: [u8; PAYLOAD_HASH_SIZE] =
            utils::blake2b_hash(serde_json::to_vec(&request)?.as_slice()).into();
        Ok(ConfidentialComputeRequest {
            nonce: STANDARD.encode(nonce),
            salt: STANDARD.encode(salt),
            client_dh_public_key: STANDARD.encode(PublicKey::from(client_private_key).to_bytes()),
            node_dh_public_key: STANDARD.encode(node_public_key.to_bytes()),
            plaintext_body_hash: STANDARD.encode(&payload_hash),
            stack_small_id,
            ciphertext: STANDARD.encode(ciphertext),
            stream: Some(false),
            model_name,
            num_compute_units: Some(MAX_COMPUTE_UNITS),
        })
    }

    /// Decrypts an encrypted chat completion response using AES-GCM
    ///
    /// This function performs the following steps:
    /// 1. Derives a shared secret using Diffie-Hellman key exchange
    /// 2. Generates a symmetric key using HKDF with SHA-256
    /// 3. Decrypts the ciphertext using AES-GCM
    /// 4. Deserializes the plaintext into a ChatCompletionResponse
    ///
    /// # Arguments
    /// * `ciphertext` - The encrypted response data
    /// * `client_private_key` - The client's X25519 private key
    /// * `node_public_key` - The node's X25519 public key
    /// * `nonce` - A 12-byte nonce used for AES-GCM encryption
    /// * `salt` - A 16-byte salt used for key derivation
    ///
    /// # Returns
    /// * `Ok(ChatCompletionResponse)` - The decrypted and deserialized response
    /// * `Err(AtomaSdkError)` if:
    ///   - Key derivation fails
    ///   - Decryption fails
    ///   - JSON deserialization fails
    ///
    /// # Security
    /// This function implements several cryptographic security measures:
    /// - Perfect forward secrecy via Diffie-Hellman key exchange
    /// - Key derivation using HKDF with SHA-256
    /// - Authenticated encryption using AES-GCM
    #[instrument(level = "info", name = "decrypt_chat_completions_response", skip_all)]
    pub(crate) fn decrypt_chat_completions_response(
        ciphertext: Vec<u8>,
        client_private_key: &StaticSecret,
        node_public_key: &PublicKey,
        nonce: [u8; NONCE_SIZE],
        salt: [u8; SALT_SIZE],
    ) -> Result<ChatCompletionResponse> {
        let shared_secret = client_private_key.diffie_hellman(&node_public_key);

        let hkdf = Hkdf::<Sha256>::new(Some(&salt), shared_secret.as_bytes());
        let mut symmetric_key = [0u8; 32];
        hkdf.expand(b"", &mut symmetric_key)?;

        let cipher = Aes256Gcm::new(&symmetric_key.into());
        let plaintext = cipher
            .decrypt(&nonce.into(), ciphertext.as_slice())
            .map_err(|e| AtomaSdkError::DecryptResponseError(e.to_string()))?;
        Ok(serde_json::from_slice(&plaintext)?)
    }

    /// Verifies the integrity and authenticity of a chat completion response.
    ///
    /// This function performs two critical security checks:
    /// 1. Verifies that the response hash matches the computed hash of the response body
    /// 2. Validates the cryptographic signature of the response
    ///
    /// # Arguments
    /// * `response_body` - The decrypted chat completion response to verify
    /// * `response_hash` - Optional Blake2b hash of the response body (32 bytes)
    /// * `signature` - Optional base64-encoded signature of the response hash
    ///
    /// # Returns
    /// * `Ok(())` if both the hash and signature are valid
    /// * `Err(AtomaSdkError::VerifyResponseHashAndSignatureError)` if:
    ///   - The response hash or signature is missing
    ///   - The computed hash doesn't match the provided hash
    ///   - The signature verification fails
    ///
    /// # Security
    /// This function is critical for ensuring:
    /// - Response integrity (through hash verification)
    /// - Response authenticity (through signature verification)
    /// - Protection against response tampering

    #[instrument(
        level = "debug",
        name = "verify_response_hash_and_signature",
        skip_all,
        fields(
            response_hash = ?response_hash,
            signature = ?signature,
        )
    )]
    pub(crate) fn verify_response_hash_and_signature(
        response_body: &ChatCompletionResponse,
        response_hash: Option<[u8; PAYLOAD_HASH_SIZE]>,
        signature: Option<&str>,
    ) -> Result<()> {
        if response_hash.is_none() || signature.is_none() {
            error!("Response hash or signature is missing");
            return Err(AtomaSdkError::VerifyResponseHashAndSignatureError(
                "Response hash or signature is missing".to_string(),
            ));
        }
        let computed_response_hash: [u8; PAYLOAD_HASH_SIZE] =
            utils::blake2b_hash(serde_json::to_vec(response_body)?.as_slice()).into();
        if response_hash.unwrap() != computed_response_hash {
            error!("Response hash does not match computed response hash");
            return Err(AtomaSdkError::VerifyResponseHashAndSignatureError(
                "Response hash does not match computed response hash".to_string(),
            ));
        }
        verify_signature(signature.unwrap(), &computed_response_hash)?;
        Ok(())
    }

    /// Verifies the authenticity of a request by checking its signature against the provided hash.
    ///
    /// # Arguments
    /// * `base64_signature` - A base64-encoded signature string that contains:
    ///   - The signature itself
    ///   - The public key
    ///   - The signature scheme used
    /// * `body_hash` - A 32-byte Blake2b hash of the request body
    ///
    /// # Returns
    /// * `Ok(())` if the signature is valid
    /// * `Err(StatusCode)` if:
    ///   - The signature cannot be parsed (`BAD_REQUEST`)
    ///   - The public key is invalid (`BAD_REQUEST`)
    ///   - The signature scheme is unsupported (`BAD_REQUEST`)
    ///   - The signature verification fails (`UNAUTHORIZED`)
    ///
    /// # Supported Signature Schemes
    /// - ED25519
    /// - Secp256k1
    /// - Secp256r1
    ///
    /// # Security Note
    /// This function is critical for ensuring request authenticity. It verifies that:
    /// 1. The request was signed by the owner of the public key
    /// 2. The request body hasn't been tampered with since signing
    #[instrument(level = "trace", skip_all)]
    pub fn verify_signature(
        base64_signature: &str,
        body_hash: &[u8; PAYLOAD_HASH_SIZE],
    ) -> Result<()> {
        let signature = Signature::from_str(base64_signature).map_err(|_| {
            error!("Failed to parse signature");
            AtomaSdkError::VerifyResponseHashAndSignatureError(
                "Failed to parse signature".to_string(),
            )
        })?;
        let signature_bytes = signature.signature_bytes();
        let public_key_bytes = signature.public_key_bytes();
        let signature_scheme = signature.scheme();
        let public_key =
            SuiPublicKey::try_from_bytes(signature_scheme, public_key_bytes).map_err(|e| {
                error!("Failed to extract public key from bytes, with error: {e}");
                AtomaSdkError::VerifyResponseHashAndSignatureError(
                    "Failed to extract public key from bytes".to_string(),
                )
            })?;

        match signature_scheme {
            SignatureScheme::ED25519 => {
                let public_key = Ed25519PublicKey::from_bytes(public_key.as_ref()).unwrap();
                let signature = Ed25519Signature::from_bytes(signature_bytes).unwrap();
                public_key.verify(body_hash, &signature).map_err(|_| {
                    error!("Failed to verify signature");
                    AtomaSdkError::VerifyResponseHashAndSignatureError(
                        "Failed to verify signature".to_string(),
                    )
                })?;
            }
            SignatureScheme::Secp256k1 => {
                let public_key = Secp256k1PublicKey::from_bytes(public_key.as_ref()).unwrap();
                let signature = Secp256k1Signature::from_bytes(signature_bytes).unwrap();
                public_key.verify(body_hash, &signature).map_err(|_| {
                    error!("Failed to verify signature");
                    AtomaSdkError::VerifyResponseHashAndSignatureError(
                        "Failed to verify signature".to_string(),
                    )
                })?;
            }
            SignatureScheme::Secp256r1 => {
                let public_key = Secp256r1PublicKey::from_bytes(public_key.as_ref()).unwrap();
                let signature = Secp256r1Signature::from_bytes(signature_bytes).unwrap();
                public_key.verify(body_hash, &signature).map_err(|_| {
                    error!("Failed to verify signature");
                    AtomaSdkError::VerifyResponseHashAndSignatureError(
                        "Failed to verify signature".to_string(),
                    )
                })?;
            }
            _ => {
                error!("Currently unsupported signature scheme");
                return Err(AtomaSdkError::VerifyResponseHashAndSignatureError(
                    "Currently unsupported signature scheme".to_string(),
                ));
            }
        }
        Ok(())
    }
}

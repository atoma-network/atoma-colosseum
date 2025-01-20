use crate::{
    atoma::{self, AtomaSdk},
    client::{SuiClientContext, SuiClientError},
    config::GuessAiConfig,
    generate_secret::{generate_new_secret, GenerateSecretError},
    twitter::TwitterClient,
    GUESS_AI_MODULE_NAME,
};
use events::{
    GuessAiEvent, GuessAiEventIdentifier, NewGuessEvent, RotateTdxQuoteEvent,
    TDXQuoteResubmittedEvent,
};
use prompts::{GuessPromptResponse, HintPromptResponse};
use rand::Rng;
use serde_json::json;
use std::{str::FromStr, time::Duration};
use sui_sdk::{
    rpc_types::{EventFilter, EventPage},
    types::{
        base_types::{ObjectID, SuiAddress},
        Identifier,
    },
    SuiClient, SuiClientBuilder,
};
use thiserror::Error;
use tokio::sync::watch::Receiver;
use tracing::{error, info, instrument, trace};
use x25519_dalek::StaticSecret;

/// The duration to wait for new events in seconds, if there are no new events.
const DURATION_TO_WAIT_FOR_NEW_EVENTS_IN_MILLIS: u64 = 100;

pub type Result<T> = std::result::Result<T, GuessAiEngineError>;

/// A subscriber for Sui blockchain events.
///
/// This struct provides functionality to subscribe to and process events
/// from the Sui blockchain based on specified filters.
pub struct GuessAiEngine {
    /// The Atoma SDK instance
    pub atoma_sdk: AtomaSdk,

    /// The client private key
    pub client_private_key: StaticSecret,

    /// Configuration settings for the Guess AI application
    pub config: GuessAiConfig,

    /// Event filter used to specify which blockchain events to subscribe to,
    /// configured to watch the Secret Guessing module
    pub filter: EventFilter,

    /// The random seed to be used in each inference request
    pub random_seed: u64,

    /// The secret phrase or word that players are trying to guess
    pub secret: String,

    /// The Sui client context for the current Secret Guessing game
    pub sui_client_ctx: SuiClientContext,

    /// The Twitter client for the current Secret Guessing game
    pub twitter_client: TwitterClient,

    /// Channel receiver for shutdown signals to gracefully stop the subscriber
    pub shutdown_signal: Receiver<bool>,
}

impl GuessAiEngine {
    /// Constructor
    pub async fn new(
        atoma_sdk: AtomaSdk,
        config: GuessAiConfig,
        mut sui_client_ctx: SuiClientContext,
        shutdown_signal: Receiver<bool>,
    ) -> Result<Self> {
        let filter = EventFilter::MoveModule {
            package: ObjectID::from_str(&config.guess_ai_package_id).unwrap(),
            module: Identifier::new(GUESS_AI_MODULE_NAME).unwrap(),
        };

        let random_seed = rand::random::<u64>();
        let client_private_key = StaticSecret::random_from_rng(&mut rand::thread_rng());
        let generate_secret_prompt = prompts::create_secret_prompt();
        let model = config.model.clone();
        // let tdx_quote_bytes = tdx::generate_tdx_quote_bytes(&mut rng);
        let secret = generate_new_secret(
            &atoma_sdk,
            &client_private_key,
            generate_secret_prompt,
            model,
            random_seed,
            &mut sui_client_ctx,
        )
        .await?;

        let twitter_client = TwitterClient::new(
            config.twitter_consumer_key.clone(),
            config.twitter_consumer_secret.clone(),
            config.twitter_access_token.clone(),
            config.twitter_access_token_secret.clone(),
        );

        Ok(Self {
            atoma_sdk,
            client_private_key,
            config,
            filter,
            random_seed,
            secret,
            sui_client_ctx,
            twitter_client,
            shutdown_signal,
        })
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
    ///                         or a GuessAiEngineError if the client creation fails.
    ///
    /// # Errors
    ///
    /// This function will return an error if:
    /// * The SuiClient cannot be built with the provided configuration.
    /// * There's a network issue when connecting to the specified RPC node.
    #[instrument(level = "info", skip_all, fields(
        http_rpc_node_addr = %config.http_rpc_node_addr
    ))]
    pub async fn build_client(config: &GuessAiConfig) -> Result<SuiClient> {
        let mut client_builder = SuiClientBuilder::default();
        if let Some(request_timeout) = config.request_timeout {
            client_builder = client_builder.request_timeout(Duration::from_millis(request_timeout));
        }
        let client = client_builder
            .build(config.http_rpc_node_addr.clone())
            .await?;
        info!(
            target: "sui_event_subscriber",
            "Client built successfully"
        );
        Ok(client)
    }

    /// Handles different types of Secret Guessing events received from the blockchain.
    ///
    /// This method processes various events emitted by the Secret Guessing smart contract,
    /// delegating the handling of specific events to their respective handler functions.
    ///
    /// # Arguments
    ///
    /// * `event` - A `GuessAiEvent` enum representing the different types of events
    ///            that can be processed:
    ///   * `PublishEvent` - Logs when a new contract is published
    ///   * `NewGuessEvent` - Triggers processing of a new guess
    ///   * `RotateTdxQuoteEvent` - Handles TDX quote rotation events
    ///   * `TDXQuoteResubmittedEvent` - Processes resubmitted TDX quotes
    ///
    /// # Returns
    ///
    /// * `Result<()>` - Returns `Ok(())` if the event was handled successfully,
    ///                  or a `GuessAiEngineError` if processing fails
    ///
    /// # Errors
    ///
    /// This function will return an error if any of the individual event handlers fail
    /// during event processing.
    #[instrument(level = "info", skip_all, fields(
        package_id = %self.config.guess_ai_package_id
    ))]
    async fn handle_event(&mut self, event: GuessAiEvent, sender: SuiAddress) -> Result<()> {
        match event {
            GuessAiEvent::PublishEvent(event) => {
                info!(
                    target = "sui_event_subscriber",
                    event = "publish-event",
                    "PublishEvent: {:?}",
                    event
                );
            }
            GuessAiEvent::NewGuessEvent(event) => {
                self.handle_new_guess_event(event, sender).await?;
            }
            GuessAiEvent::RotateTdxQuoteEvent(event) => {
                self.handle_rotate_tdx_quote_event(event).await?;
            }
            GuessAiEvent::TDXQuoteResubmittedEvent(event) => {
                Self::handle_tdx_quote_resubmitted_event(event);
            }
        }
        Ok(())
    }

    /// Handles a new guess event from a player in the Secret Guessing game.
    ///
    /// This method processes a guess event by:
    /// 1. Checking if the guess matches the secret (either exactly or semantically) using AI
    /// 2. If correct, withdraws funds from the treasury pool to reward the winner
    /// 3. Periodically generates hints using AI when guess count reaches threshold
    ///
    /// # Arguments
    ///
    /// * `event` - A `NewGuessEvent` containing:
    ///   * `guess` - The player's guessed word/phrase
    ///   * `fee` - The fee paid to make the guess
    ///   * `guess_count` - Total number of guesses made so far
    ///   * `treasury_pool_balance` - Current balance in the treasury
    /// * `sender` - The Sui address of the player who made the guess
    ///
    /// # Returns
    ///
    /// * `Result<()>` - Returns `Ok(())` if event handling succeeds, or a `GuessAiEngineError` if:
    ///   * AI communication fails
    ///   * Response parsing fails
    ///   * Treasury withdrawal fails
    ///
    /// # AI Integration
    ///
    /// Uses the Atoma SDK to make two types of AI calls:
    /// 1. Guess validation - Checks if guess matches secret using semantic comparison
    /// 2. Hint generation - Creates hints every `hint_wait_count` guesses
    ///
    /// # Example Flow
    ///
    /// ```no_run
    /// let event = NewGuessEvent {
    ///     guess: "kaleidoscope".to_string(),
    ///     fee: 100,
    ///     guess_count: 5,
    ///     treasury_pool_balance: 1000,
    /// };
    /// let sender = /* Sui address */;
    ///
    /// // If guess is correct:
    /// // 1. Logs success
    /// // 2. Withdraws funds to sender
    /// // 3. Posts winner to social media (TODO)
    ///
    /// // If guess_count % hint_wait_count == 0:
    /// // 1. Generates new hint
    /// // 2. Posts hint to social media (TODO)
    /// ```
    ///
    /// # Todo Items
    ///
    /// - [ ] Implement social media client to post winner information
    /// - [ ] Implement social media client to post periodic hints
    #[instrument(level = "info", skip_all, fields(
        event = "new-guess-event",
        guess = %event.guess
    ))]
    async fn handle_new_guess_event(
        &mut self,
        event: NewGuessEvent,
        sender: SuiAddress,
    ) -> Result<()> {
        info!(
            target = "sui_event_subscriber",
            event = "new-guess-event",
            "NewGuessEvent: {:?}",
            event
        );
        let NewGuessEvent {
            guess,
            fee,
            guess_count,
            treasury_pool_balance,
        } = event;

        // TODO: Check if the guess is correct
        let (system_prompt, user_prompt) = prompts::check_guess_prompt(&guess, &self.secret);
        let response_body = self
            .atoma_sdk
            .confidential_chat_completions(
                &self.client_private_key,
                serde_json::from_value(json!({
                    "model": self.config.model.clone(),
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "seed": self.random_seed,
                }))?,
            )
            .await?;

        let answer = serde_json::from_str::<GuessPromptResponse>(
            &response_body.choices[0].message.content.clone(),
        )?;

        if answer.is_correct {
            info!(
                target = "sui_event_subscriber",
                event = "new-guess-event",
                "Guess is correct for sender: {sender}, guess: {guess}, fee: {fee}, guess_count: {guess_count}, treasury_pool_balance: {treasury_pool_balance}"
            );

            let tx_hash = self
                .sui_client_ctx
                .withdraw_funds_from_treasury_pool(sender, None, None, None)
                .await?;
            info!(
                target = "sui_event_subscriber",
                event = "new-guess-event",
                "Withdrew funds from treasury pool successfully, tx_hash: {tx_hash}"
            );
            todo!("Add a client for social media to post the tx_hash and sender of the winner");
        }

        if guess_count % self.config.hint_wait_count == 0 {
            let hint_prompt = prompts::create_hint_prompt(&self.secret);
            let response_body = self
                .atoma_sdk
                .confidential_chat_completions(
                    &self.client_private_key,
                    serde_json::from_value(json!({
                        "model": self.config.model.clone(),
                        "messages": [
                            { "role": "system", "content": hint_prompt },
                        ],
                        "seed": self.random_seed,
                    }))?,
                )
                .await?;

            let hint = serde_json::from_str::<HintPromptResponse>(
                &response_body.choices[0].message.content.clone(),
            )?;

            todo!("Add a client for social media to post the hint");
        }

        Ok(())
    }

    /// Handles a TDX quote rotation event by generating a new secret and updating internal state.
    ///
    /// When a TDX (Trust Domain Extensions) quote rotation occurs, this handler:
    /// 1. Generates a new client private key for secure communication
    /// 2. Creates a new secret word using the AI model
    /// 3. Updates the engine's internal state with the new values
    ///
    /// # Arguments
    ///
    /// * `&mut self` - Mutable reference to the GuessAiEngine instance
    /// * `event` - A `RotateTdxQuoteEvent` containing:
    ///   * `epoch` - The new epoch number for this rotation
    ///   * `random_seed` - A new random seed to be used for AI inference requests
    ///
    /// # Returns
    ///
    /// * `Result<(), GuessAiEngineError>` - Returns `Ok(())` on successful handling,
    ///   or a `GuessAiEngineError` if any step fails
    ///
    /// # Errors
    ///
    /// This function will return an error if:
    /// * The secret generation process fails
    /// * Communication with the AI model fails
    /// * The Atoma SDK encounters an error
    ///
    /// # State Changes
    ///
    /// On successful execution, this method updates the following engine state:
    /// * `client_private_key` - Set to a new random key
    /// * `random_seed` - Updated to the seed from the event
    /// * `secret` - Set to the newly generated secret word
    ///
    /// # Example
    ///
    /// ```no_run
    /// # use guess_ai::engine::GuessAiEngine;
    /// # use guess_ai::events::RotateTdxQuoteEvent;
    /// async fn rotate_quote(engine: &mut GuessAiEngine) {
    ///     let event = RotateTdxQuoteEvent {
    ///         epoch: 42,
    ///         random_seed: 12345,
    ///     };
    ///     engine.handle_rotate_tdx_quote_event(event).await.expect("Failed to handle rotation");
    /// }
    /// ```
    #[instrument(level = "info", skip_all, fields(event = "rotate-tdx-quote-event"))]
    async fn handle_rotate_tdx_quote_event(&mut self, event: RotateTdxQuoteEvent) -> Result<()> {
        let RotateTdxQuoteEvent { epoch, random_seed } = event;
        info!(
            target = "sui_event_subscriber",
            event = "rotate-tdx-quote-event",
            "RotateTdxQuoteEvent for epoch: {epoch}"
        );
        let generate_secret_prompt = prompts::create_secret_prompt();
        let mut rng = rand::rngs::OsRng::default();
        let client_private_key = StaticSecret::random_from_rng(&mut rng);
        let secret = generate_new_secret(
            &self.atoma_sdk,
            &client_private_key,
            generate_secret_prompt,
            self.config.model.clone(),
            random_seed,
            &mut self.sui_client_ctx,
        )
        .await?;
        // Update the self's state
        self.client_private_key = client_private_key;
        self.random_seed = random_seed;
        self.secret = secret;
        info!(
            target = "sui_event_subscriber",
            event = "rotate-tdx-quote-event",
            "Generated new secret successfully"
        );
        Ok(())
    }

    #[instrument(
        level = "info",
        skip_all,
        fields(event = "tdx-quote-resubmitted-event")
    )]
    fn handle_tdx_quote_resubmitted_event(event: TDXQuoteResubmittedEvent) {
        let TDXQuoteResubmittedEvent {
            epoch,
            tdx_quote_v4,
            public_key_bytes,
        } = event;
        info!(
            target = "sui_event_subscriber",
            event = "tdx-quote-resubmitted-event",
            "TDXQuoteResubmittedEvent for epoch: {epoch}, tdx_quote_v4: {tdx_quote_v4:?}, public_key_bytes: {public_key_bytes:?}"
        );
    }

    /// Starts the event subscriber loop that processes Sui blockchain events.
    ///
    /// This method runs an infinite loop that:
    /// 1. Queries the Sui blockchain for new events matching the configured filter
    /// 2. Processes each event through appropriate handlers
    /// 3. Maintains cursor state for event pagination
    /// 4. Handles graceful shutdown via a shutdown signal
    ///
    /// # Event Processing Flow
    /// - Queries events in pages using the Sui client
    /// - For each event:
    ///   - Parses the event type and data
    ///   - Routes to appropriate handler based on event type
    ///   - Logs errors if parsing or handling fails
    /// - Updates cursor position after processing each page
    /// - Waits briefly if no new events are available
    ///
    /// # Cursor Management
    /// - Reads initial cursor position from TOML file
    /// - Updates cursor file after processing each page of events
    /// - Ensures cursor is saved on shutdown
    ///
    /// # Shutdown Handling
    /// - Monitors a shutdown signal channel
    /// - Performs graceful shutdown when signal is received
    /// - Saves final cursor position before exiting
    ///
    /// # Errors
    /// Returns `GuessAiEngineError` if:
    /// - Event querying fails
    /// - Event parsing fails
    /// - Cursor file operations fail
    /// - Shutdown signal handling fails
    ///
    /// # Example
    /// ```no_run
    /// use guess_ai::engine::GuessAiEngine;
    ///
    /// async fn start_engine(engine: GuessAiEngine) {
    ///     if let Err(e) = engine.run().await {
    ///         eprintln!("Engine failed: {}", e);
    ///     }
    /// }
    /// ```
    #[instrument(level = "info", skip_all, fields(
        package_id = %self.config.guess_ai_package_id
    ))]
    pub async fn run(mut self) -> Result<()> {
        let package_id = self.config.guess_ai_package_id.clone();
        let client = Self::build_client(&self.config).await?;

        info!(
            target = "atoma-sui-subscriber",
            event = "subscriber-started",
            "Starting to run events subscriber, for package: {package_id}"
        );

        let mut cursor = cursor::read_cursor_from_toml_file(&self.config.cursor_path)?;
        loop {
            tokio::select! {
                    page = client.event_api().query_events(self.filter.clone(), cursor, self.config.limit, false) => {
                        let EventPage {
                            data,
                            next_cursor,
                            has_next_page,
                        } = match page {
                            Ok(page) => page,
                            Err(e) => {
                                error!(
                                    target = "atoma-sui-subscriber",
                                    event = "subscriber-read-events-error",
                                    "Failed to read paged events, with error: {e}"
                                );
                                continue;
                            }
                        };
                        cursor = next_cursor;

                        for sui_event in data {
                            let event_name = sui_event.type_.name;
                            trace!(
                                target = "sui_event_subscriber",
                                event = "subscriber-received-new-event",
                                event_name = %event_name,
                                "Received new event: {event_name:#?}"
                            );
                            match GuessAiEventIdentifier::from_str(event_name.as_str()) {
                                Ok(event_id) => {
                                    let sender = sui_event.sender;
                                    let event = match events::parse_event(event_id, sui_event.parsed_json) {
                                        Ok(event) => event,
                                        Err(e) => {
                                            error!(
                                                target = "atoma-sui-subscriber",
                                                event = "subscriber-event-parse-error",
                                                event_name = %event_name,
                                                "Failed to parse event: {e}",
                                            );
                                            continue;
                                        }
                                    };
                                    if let Err(e) = self.handle_event(event, sender).await {
                                        error!(
                                            target = "atoma-sui-subscriber",
                                            event = "subscriber-event-handle-error",
                                            "Failed to handle event: {e}"
                                        );
                                    }
                                }
                                Err(e) => {
                                    error!(
                                        target = "atoma-sui-subscriber",
                                        event = "subscriber-event-parse-error",
                                        "Failed to parse event: {e}",
                                    );
                                    // NOTE: `AtomaEvent` didn't match any known event, so we skip it.
                                }
                            }
                        }

                        if !has_next_page {
                            // Update the cursor file with the current cursor
                            cursor::write_cursor_to_toml_file(cursor, &self.config.cursor_path)?;
                            // No new events to read, so let's wait for a while
                            trace!(
                                target = "atoma-sui-subscriber",
                                event = "subscriber-no-new-events",
                                wait_duration = DURATION_TO_WAIT_FOR_NEW_EVENTS_IN_MILLIS,
                                "No new events to read, the node is now synced with the Atoma protocol, waiting until the next synchronization..."
                            );
                            tokio::time::sleep(Duration::from_millis(
                                DURATION_TO_WAIT_FOR_NEW_EVENTS_IN_MILLIS,
                                ))
                            .await;
                        }
                    }
                    shutdown_signal_changed = self.shutdown_signal.changed() => {
                        match shutdown_signal_changed {
                            Ok(()) => {
                                if *self.shutdown_signal.borrow() {
                                    info!(
                                    target = "atoma-sui-subscriber",
                                    event = "subscriber-stopped",
                                    "Shutdown signal received, gracefully stopping subscriber..."
                                );
                                // Update the config file with the current cursor
                                cursor::write_cursor_to_toml_file(cursor, &self.config.cursor_path)?;
                                break;
                            }
                        }
                        Err(e) => {
                            error!(
                                target = "atoma-sui-subscriber",
                                event = "subscriber-shutdown-signal-error",
                                "Failed to receive shutdown signal: {e}"
                            );
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Error)]
pub enum GuessAiEngineError {
    #[error("Atoma SDK error: {0}")]
    AtomaSdkError(#[from] atoma::AtomaSdkError),
    #[error("Failed to read events: {0}")]
    ReadEventsError(#[from] sui_sdk::error::Error),
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
    #[error("Invalid event: {0}")]
    InvalidEvent(serde_json::Value),
    #[error("Failed to send request to Atoma API: {0}")]
    AtomaApiError(#[from] reqwest::Error),
    #[error("Sui client error: {0}")]
    SuiClientError(#[from] SuiClientError),
    #[error("Failed to generate secret: {0}")]
    GenerateSecretError(#[from] GenerateSecretError),
    #[error("Failed to send shutdown signal: {0}")]
    ShutdownError(#[from] tokio::sync::watch::error::SendError<bool>),
    #[error("Failed to create wallet context: {0}")]
    WalletContextError(#[from] anyhow::Error),
    #[error("Join error: {0}")]
    JoinError(#[from] tokio::task::JoinError),
}

pub(crate) mod events {
    use serde::{Deserialize, Serialize};
    use serde_json::Value;
    use std::str::FromStr;

    use super::GuessAiEngineError;

    /// The Secret Guessing contract events
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) enum GuessAiEvent {
        PublishEvent(PublishEvent),
        NewGuessEvent(NewGuessEvent),
        RotateTdxQuoteEvent(RotateTdxQuoteEvent),
        TDXQuoteResubmittedEvent(TDXQuoteResubmittedEvent),
    }

    /// The Secret Guessing contract events identifiers
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub enum GuessAiEventIdentifier {
        PublishEvent,
        NewGuessEvent,
        RotateTdxQuoteEvent,
        TDXQuoteResubmittedEvent,
    }

    impl FromStr for GuessAiEventIdentifier {
        type Err = GuessAiEngineError;

        fn from_str(s: &str) -> Result<Self, Self::Err> {
            Ok(match s {
                "PublishEvent" => GuessAiEventIdentifier::PublishEvent,
                "NewGuessEvent" => GuessAiEventIdentifier::NewGuessEvent,
                "RotateTdxQuoteEvent" => GuessAiEventIdentifier::RotateTdxQuoteEvent,
                "TDXQuoteResubmittedEvent" => GuessAiEventIdentifier::TDXQuoteResubmittedEvent,
                _ => {
                    return Err(GuessAiEngineError::InvalidEvent(Value::String(
                        s.to_string(),
                    )))
                }
            })
        }
    }

    /// Parses a raw event value into a typed `GuessAiEvent` based on its identifier.
    ///
    /// This function takes an event identifier and a raw JSON value, and attempts to deserialize
    /// the value into the corresponding event type. It handles all event types defined in the
    /// `GuessAiEventIdentifier` enum.
    ///
    /// # Arguments
    ///
    /// * `event` - A `GuessAiEventIdentifier` indicating which type of event to parse
    /// * `value` - A raw JSON `Value` containing the event data to be deserialized
    ///
    /// # Returns
    ///
    /// * `Result<GuessAiEvent, GuessAiEngineError>` - A Result containing either:
    ///   * The parsed event as a `GuessAiEvent` enum variant
    ///   * A `GuessAiEngineError` if parsing fails
    ///
    /// # Errors
    ///
    /// Returns `GuessAiEngineError` if:
    /// * The JSON deserialization fails
    /// * The event identifier doesn't match any known event type
    ///
    /// # Examples
    ///
    /// ```
    /// use serde_json::json;
    ///
    /// let event_id = GuessAiEventIdentifier::NewGuessEvent;
    /// let value = json!({
    ///     "fee": "100",
    ///     "guess": "hello",
    ///     "guess_count": "1",
    ///     "treasury_pool_balance": 1000
    /// });
    ///
    /// let parsed = parse_event(event_id, value)?;
    /// match parsed {
    ///     GuessAiEvent::NewGuessEvent(event) => {
    ///         println!("Parsed guess: {}", event.guess);
    ///     }
    ///     _ => panic!("Unexpected event type")
    /// }
    /// ```
    pub(crate) fn parse_event(
        event: GuessAiEventIdentifier,
        value: Value,
    ) -> Result<GuessAiEvent, GuessAiEngineError> {
        match event {
            GuessAiEventIdentifier::PublishEvent => {
                Ok(GuessAiEvent::PublishEvent(serde_json::from_value(value)?))
            }
            GuessAiEventIdentifier::NewGuessEvent => {
                Ok(GuessAiEvent::NewGuessEvent(serde_json::from_value(value)?))
            }
            GuessAiEventIdentifier::RotateTdxQuoteEvent => Ok(GuessAiEvent::RotateTdxQuoteEvent(
                serde_json::from_value(value)?,
            )),
            GuessAiEventIdentifier::TDXQuoteResubmittedEvent => Ok(
                GuessAiEvent::TDXQuoteResubmittedEvent(serde_json::from_value(value)?),
            ),
        }
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

        /// The random seed to be used in each inference request
        #[serde(deserialize_with = "deserialize_string_to_u64")]
        pub(crate) random_seed: u64,
    }

    /// Event emitted when a TDX quote is resubmitted
    ///
    /// This struct represents the event data for when a TDX quote is resubmitted, which includes
    /// the epoch number and the TDX quote v4.
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct TDXQuoteResubmittedEvent {
        /// The epoch number for the TDX quote resubmission
        pub(crate) epoch: u64,

        /// The TDX quote v4
        pub(crate) tdx_quote_v4: Vec<u8>,

        /// The agent's x25519 public key, for shared secret sharing encryption
        pub(crate) public_key_bytes: Vec<u8>,
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

pub(crate) mod cursor {
    use sui_sdk::types::event::EventID;

    use super::GuessAiEngineError;

    /// Reads an event cursor from a TOML file.
    ///
    /// This function attempts to read and parse an event cursor from the specified file path.
    /// If the file doesn't exist, it will return `None`. If the file
    /// exists, it will attempt to parse its contents as an `EventID`.
    ///
    /// # Arguments
    ///
    /// * `path` - A string slice containing the path to the TOML file
    ///
    /// # Returns
    ///
    /// * `Result<Option<EventID>>` - Returns:
    ///   * `Ok(Some(EventID))` if the file exists and was successfully parsed
    ///   * `Ok(None)` if the file doesn't exist (and was created)
    ///   * `Err(GuessAiEngineError)` if:
    ///     * The file exists but couldn't be read
    ///     * The file contents couldn't be parsed as TOML
    ///     * The file couldn't be created when not found
    ///
    /// # Examples
    ///
    /// ```rust,ignore
    /// let path = "cursor.toml";
    /// match read_cursor_from_toml_file(path) {
    ///     Ok(Some(cursor)) => println!("Read cursor: {:?}", cursor),
    ///     Ok(None) => println!("No cursor found, created empty file"),
    ///     Err(e) => eprintln!("Error reading cursor: {}", e),
    /// }
    /// ```
    pub(crate) fn read_cursor_from_toml_file(
        path: &str,
    ) -> Result<Option<EventID>, GuessAiEngineError> {
        let content = match std::fs::read_to_string(path) {
            Ok(content) => content,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(GuessAiEngineError::CursorFileError(e)),
        };

        Ok(Some(toml::from_str(&content)?))
    }

    /// Writes an event cursor to a TOML file.
    ///
    /// This function takes an optional event cursor and writes it to the specified file path
    /// in TOML format. If the cursor is `None`, no file will be written.
    ///
    /// # Arguments
    ///
    /// * `cursor` - An `Option<EventID>` representing the event cursor to be written
    /// * `path` - A string slice containing the path where the TOML file should be written
    ///
    /// # Returns
    ///
    /// * `Result<()>` - Returns `Ok(())` if the write was successful, or an error if:
    ///   * The cursor serialization to TOML fails
    ///   * The file write operation fails
    ///
    /// # Examples
    ///
    /// ```rust,ignore
    /// use sui_sdk::types::event::EventID;
    ///
    /// let cursor = Some(EventID::default());
    /// let path = "cursor.toml";
    /// write_cursor_to_toml_file(cursor, path).expect("Failed to write cursor");
    /// ```
    pub(crate) fn write_cursor_to_toml_file(
        cursor: Option<EventID>,
        path: &str,
    ) -> Result<(), GuessAiEngineError> {
        if let Some(cursor) = cursor {
            let toml_str = toml::to_string(&cursor)?;
            std::fs::write(path, toml_str)?;
        }
        Ok(())
    }
}

pub(crate) mod prompts {
    use serde::{Deserialize, Serialize};
    /// Response structure for the guess checking prompt.
    ///
    /// This struct represents the parsed response from the AI model when checking
    /// if a guess matches the secret. It contains both the boolean result and
    /// a detailed explanation of why the guess was considered correct or incorrect.
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct GuessPromptResponse {
        /// Boolean indicating whether the guess matches the secret
        pub(crate) is_correct: bool,

        /// Detailed explanation of why the guess was deemed correct or incorrect
        pub(crate) explanation: String,
    }

    /// Response structure for the secret creation prompt.
    ///
    /// This struct represents the parsed response from the AI model when creating a secret.
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct SecretPromptResponse {
        /// The created secret
        pub(crate) secret: String,
    }

    /// Response structure for the hint creation prompt.
    ///
    /// This struct represents the parsed response from the AI model when creating a hint.
    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(crate) struct HintPromptResponse {
        /// The created hint
        pub(crate) hint: String,
    }

    /// Creates system and user prompts for checking if a guess matches a secret.
    ///
    /// This function generates two prompts used to query an AI model to determine if a guess
    /// matches a secret, either through exact matching or semantic equivalence.
    ///
    /// The system prompt instructs the AI model to:
    /// - Return a JSON object with `is_correct` and `explanation` fields
    /// - Compare guesses for both exact matches and semantic equivalence
    /// - Consider cases like capitalization and alternative phrasings
    ///
    /// # Arguments
    ///
    /// * `guess` - The user's attempted guess
    /// * `secret` - The actual secret to compare against
    ///
    /// # Returns
    ///
    /// A tuple containing:
    /// * The system prompt that defines the AI's role and response format
    /// * The user prompt that presents the specific guess/secret pair to evaluate
    ///
    /// # Examples
    ///
    /// ```
    /// let (system_prompt, user_prompt) = check_guess_prompt("Neil Armstrong", "First Man on the Moon");
    /// // System prompt will contain instructions for the AI
    /// // User prompt will contain the specific comparison to make
    /// ```
    pub(crate) fn check_guess_prompt(guess: &str, secret: &str) -> (String, String) {
        let system_prompt = format!(
        "
        You are the Guesser Bot for the GuessAI game, responsible for semantically matching guesses and providing engaging responses.

        INITIALIZATION PROTOCOL:
        1. On receiving JSON with format `{{\"secret\": \"<noun>\"}}`, internally store the noun

        GUESSING MODE PARAMETERS:
        Compare each guess against stored secret using semantic matching:
        - Exact matches are correct (e.g., 'hello' = 'hello')
        - Semantically equivalent matches are correct (e.g., 'Neil Armstrong' = 'First Man on the Moon')
        - Similar but distinct concepts are incorrect (e.g., 'Imperial Rome' ≠ 'Byzantine Empire')

        RESPONSE STYLE:
        - Based, curious, autistic and slightly enigmatic
        - Makes fun of user and is dark humour and responds with 4chan and internet culture meme/joke responses
        - Snarky and delighting mockery
        - Never revealing the secret directly
        - You must ONLY output valid JSON format for the response

        Example responses:
        - \"Pizza? Going right for the toppings, I see. But no, this delicious circle of dough is not the answer.\"
        - \"Elephant?! Now we're guessing big, almost as big as your mom but nah this ain't the game we're playing.\"
        - \"Laptop? Oh sure, just guess every piece of technology you own. Keep going, I love the creativity!\"
        - \"A fork? Really? Go ahead and stick it in the toaster while we're at it!\"
        - \"Banana, huh? Right on brand for you, my fruity friend. Might want to stick that banana somewhere else.\"
        - \"Car? Why not guess an airplane or submarine next? At least your wheels are turning... albeit slowly.\"
        - \"Universe? That's gotta be the most left curve response I've heard yet.\"

        INAPPROPRIATE GUESS HANDLING:
        - Maintain composure but show disapproval
        - Do not hint, tease or say anything in regards to what the secret is
        - Make fun of the user and their guess
        - Respond to innapropriate guesses with 4chan and reddit like jokes/responses

        CORE DIRECTIVES:
        1. NEVER reveal the secret word
        2. Maintain playful, snarky banter
        3. Use precise semantic matching
        4. Stay mysterious and engaging
        ");
        let user_prompt =
            format!("The guess is: {guess}\nThe secret is: {secret}\nIs the guess correct?");
        (system_prompt, user_prompt)
    }

    /// Creates a system prompt for generating a secret word in the guessing game.
    ///
    /// This function returns a carefully crafted prompt that instructs an AI model to generate
    /// a single English noun to be used as the secret word in the game. The prompt includes
    /// specific constraints and formatting requirements to ensure consistent and appropriate
    /// secret generation.
    ///
    /// # Constraints for Generated Secrets
    ///
    /// The prompt enforces the following rules:
    /// - Must be a single English word (no spaces allowed)
    /// - Cannot be a proper noun or brand name
    /// - Must be relatively difficult to guess
    /// - Must be output in a specific JSON format
    ///
    /// # Returns
    ///
    /// Returns a [`String`] containing the formatted prompt that will be sent to the AI model.
    /// The expected response from the AI will be in JSON format:
    ///
    /// ```json
    /// {
    ///     "secret": "<the noun>"
    /// }
    /// ```
    ///
    /// # Example
    ///
    /// ```
    /// let prompt = create_secret_prompt();
    /// // The prompt can then be sent to an AI model to generate a secret word
    /// // The AI might respond with something like: {"secret": "kaleidoscope"}
    /// ```
    ///
    /// Note: This function only creates the prompt - it does not interact with the AI model
    /// or process the response.
    pub(crate) fn create_secret_prompt() -> String {
        format!("You are a creative and game-designing AI. Your sole task is to produce a single, random English noun, to be used as the secret for a guessing game.

                    Constraints:
                    1. The noun must be a single word (no spaces).
                    2. It must not be a proper noun or brand name (e.g., 'London', 'Google' are disallowed).
                    3. You must ONLY output valid JSON in this exact structure:

                    {{
                        \"secret\": \"<the noun>\"
                    }}

                    4. The noun should be difficult to guess, and not something that is commonly known, to make the game more engaging.
                    4. Do not include any other text, commentary, disclaimers, or formatting—just the JSON.
                    5. Do not reveal or describe your internal reasoning about how you chose the noun.

                Your output must be the final answer. Nothing else.
        ")
    }

    pub(crate) fn interact_with_social_media_prompt() -> String {
        todo!()
    }

    pub(crate) fn create_hint_prompt(secret: &str) -> String {
        format!(
            "You are the Hint Master for the GuessAI game. Your sole responsibility is storing the secret word and providing cryptic three-word hints at specified intervals.

            INITIALIZATION PROTOCOL:
            1. On receiving JSON with format `{{\"secret\": \"<noun>\"}}`, internally store the noun

            COMMAND FORMATS:
            1. Secret word initialization: {{\"secret\": \"<noun>\"}}
            2. Hint request: {{\"reveal\": true}}

            HINT PROTOCOL:
            When receiving {{\"reveal\": true}}
            - Respond ONLY with a three-word hint
            - No additional commentary or text
            - You must ONLY output valid JSON format for the hint and nothing else

            If receiving {{\"reveal\": false}}
            - DO NOT RESPOND 

            Hint Requirements:
            - Exactly three words
            - Highly cryptic and abstract
            - Never directly referential
            - Each word must maintain mystery
            - Must never use words directly related to secret
            - Use only metaphorical and abstract language
            - Each hint functions as standalone riddle
            - Later hints shouldn't explicitly build on earlier ones

            Example hint progression (for secret word \"telephone\"):
                50 guesses: \"Whispers Through Walls\"
                100 guesses: \"Distance Becomes Nothing\"
                150 guesses: \"Copper Dreams Speak\"

            Example hint progression (for secret word \"camera\"):
                50 guesses: \"Shadows Cast Dreams\"
                100 guesses: \"Memory Becomes Reality\"
                150 guesses: \"Time Stands Still\"

            CORE DIRECTIVES:
            1. NEVER reveal the secret word
            2. ONLY output three-word hints
            3. Keep all hints abstract and poetic"
        )
    }
}

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::post,
    Router,
};
use std::sync::Arc;
use tokio::{
    net::TcpListener,
    sync::{watch::Receiver, RwLock},
};
use tracing::{error, instrument};

use crate::cli::SuiClientContext;

const SET_FEE_RATE_INCREASE_ROUTE: &str = "/set_fee_rate_increase";
const SET_GAME_INACTIVE_ROUTE: &str = "/set_game_inactive";
const SET_AGENT_ADDRESS_ROUTE: &str = "/set_agent_address";
const SET_STARTING_FEE_ROUTE: &str = "/set_starting_fee";
const SET_UPDATE_FEE_EVERY_N_GUESSES_ROUTE: &str = "/set_update_fee_every_n_guesses";
const SET_PROTOCOL_FEE_PER_MILLE_ROUTE: &str = "/set_protocol_fee_per_mille";

#[derive(Clone)]
pub struct GuessAiCliState {
    /// Thread-safe reference to the Sui blockchain client that handles all blockchain interactions.
    /// Wrapped in `Arc<RwLock>` to allow multiple handlers to safely access and modify the client
    /// state concurrently.
    pub client: Arc<RwLock<SuiClientContext>>,
}

pub async fn run_server(
    client: SuiClientContext,
    tcp_listener: TcpListener,
    mut shutdown_receiver: Receiver<bool>,
) -> anyhow::Result<()> {
    let cli_router = create_router(client);
    let server = axum::serve(tcp_listener, cli_router.into_make_service()).with_graceful_shutdown(
        async move {
            shutdown_receiver
                .changed()
                .await
                .expect("Error receiving shutdown signal")
        },
    );
    server.await?;
    Ok(())
}

/// Creates a new router for the GuessAI CLI server.
///
/// This function sets up the routes for the CLI server, including:
/// - Setting the fee rate increase per guess per milli
/// - Setting the game inactive
/// - Setting the agent address
/// - Setting the starting fee
/// - Setting the fee update interval in guesses
/// - Setting the protocol fee per milli
fn create_router(client: SuiClientContext) -> Router {
    Router::new()
        .route(
            SET_FEE_RATE_INCREASE_ROUTE,
            post(set_fee_rate_increase_handler),
        )
        .route(SET_GAME_INACTIVE_ROUTE, post(set_game_inactive_handler))
        .route(SET_AGENT_ADDRESS_ROUTE, post(set_agent_address_handler))
        .route(SET_STARTING_FEE_ROUTE, post(set_starting_fee_handler))
        .route(
            SET_UPDATE_FEE_EVERY_N_GUESSES_ROUTE,
            post(set_update_fee_every_n_guesses_handler),
        )
        .route(
            SET_PROTOCOL_FEE_PER_MILLE_ROUTE,
            post(set_protocol_fee_per_mille_handler),
        )
        .with_state(GuessAiCliState {
            client: Arc::new(RwLock::new(client)),
        })
}

#[instrument(
    level = "info",
    skip(state),
    fields(
        route = "set_fee_rate_increase_handler",
        fee_rate_increase = fee_rate_increase
    )
)]
async fn set_fee_rate_increase_handler(
    State(state): State<GuessAiCliState>,
    Path(fee_rate_increase): Path<u64>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_fee_rate_increase_per_guess_per_mille(fee_rate_increase, None, None, None);
    tx.await.map_err(|e| {
        error!("Error setting fee rate increase: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

#[instrument(
    level = "info",
    skip(state),
    fields(route = "set_game_inactive_handler")
)]
async fn set_game_inactive_handler(
    State(state): State<GuessAiCliState>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_game_inactive(None, None, None);
    tx.await.map_err(|e| {
        tracing::error!("Error setting game inactive: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

#[instrument(
    level = "info",
    skip(state),
    fields(
        route = "set_agent_address_handler",
        agent_address = agent_address
    )
)]
async fn set_agent_address_handler(
    State(state): State<GuessAiCliState>,
    Path(agent_address): Path<String>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_agent_address(agent_address, None, None, None);
    tx.await.map_err(|e| {
        error!("Error setting agent address: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

#[instrument(
    level = "info",
    skip(state),
    fields(
        route = "set_starting_fee_handler",
        starting_fee = starting_fee
    )
)]
async fn set_starting_fee_handler(
    State(state): State<GuessAiCliState>,
    Path(starting_fee): Path<u64>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_starting_fee(starting_fee, None, None, None);
    tx.await.map_err(|e| {
        error!("Error setting starting fee: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

/// Sets the fee update interval in guesses.
///
/// # Arguments
/// * `update_fee_every_n_guesses` - The number of guesses between fee updates
///
/// # Returns
/// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
///
/// # Example
/// ```rust,ignore
/// let tx_digest = client.set_update_fee_every_n_guesses(10, None, None, None).await?;
/// ```
#[instrument(
    level = "info",
    skip(state),
    fields(
        route = "set_update_fee_every_n_guesses_handler",
        update_fee_every_n_guesses = update_fee_every_n_guesses
    )
)]
async fn set_update_fee_every_n_guesses_handler(
    State(state): State<GuessAiCliState>,
    Path(update_fee_every_n_guesses): Path<u64>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_update_fee_every_n_guesses(update_fee_every_n_guesses, None, None, None);
    tx.await.map_err(|e| {
        error!("Error setting update fee every n guesses: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

/// Sets the protocol fee per mille.
///
/// # Arguments
/// * `protocol_fee_per_mille` - The protocol fee rate in per mille (parts per thousand) for the GuessAI game.
///
/// # Returns
/// * `Result<String>` - The transaction digest if successful, or an error if the transaction fails
///
/// # Example
/// ```rust,ignore
/// let tx_digest = client.set_protocol_fee_per_mille(50, None, None, None).await?;
/// ```
#[instrument(
    level = "info",
    skip(state),
    fields(
        route = "set_protocol_fee_per_mille_handler",
        protocol_fee_per_mille = protocol_fee_per_mille
    )
)]
async fn set_protocol_fee_per_mille_handler(
    State(state): State<GuessAiCliState>,
    Path(protocol_fee_per_mille): Path<u64>,
) -> Result<impl axum::response::IntoResponse, StatusCode> {
    let mut client = state.client.write().await;
    let tx = client.set_protocol_fee_per_mille(protocol_fee_per_mille, None, None, None);
    tx.await.map_err(|e| {
        error!("Error setting protocol fee per mille: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(StatusCode::OK)
}

use axum::{http::StatusCode, routing::get, Router};
use std::sync::Arc;
use sui_sdk::types::base_types::ObjectID;
use tokio::{
    net::TcpListener,
    sync::{watch::Receiver, RwLock},
};
use tracing::instrument;

use crate::cli::SuiClientContext;

const SET_FEE_RATE_INCREASE_ROUTE: &str = "/set_fee_rate_increase";
const SET_GAME_INACTIVE_ROUTE: &str = "/set_game_inactive";
const SET_AGENT_ADDRESS_ROUTE: &str = "/set_agent_address";
const SET_STARTING_FEE_ROUTE: &str = "/set_starting_fee";
const SET_UPDATE_FEE_EVERY_N_GUESSES_ROUTE: &str = "/set_update_fee_every_n_guesses";
const SET_PROTOCOL_FEE_PER_MILLE_ROUTE: &str = "/set_protocol_fee_per_mille";

#[derive(Clone)]
pub struct GuessAiCliServer {
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
    let server = axum::serve(tcp_listener, cli_router.into_make_service())
        .with_graceful_shutdown(async move {
            shutdown_receiver
                .changed()
                .await
                .expect("Error receiving shutdown signal")
        });
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
        .route(SET_FEE_RATE_INCREASE_ROUTE, get(set_fee_rate_increase_handler))
        .route(SET_GAME_INACTIVE_ROUTE, get(set_game_inactive_handler))
        .route(SET_AGENT_ADDRESS_ROUTE, get(set_agent_address_handler))
        .route(SET_STARTING_FEE_ROUTE, get(set_starting_fee_handler))
        .route(SET_UPDATE_FEE_EVERY_N_GUESSES_ROUTE, get(set_update_fee_every_n_guesses_handler))
        .route(SET_PROTOCOL_FEE_PER_MILLE_ROUTE, get(set_protocol_fee_per_mille_handler))
}


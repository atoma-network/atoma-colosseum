use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::Method,
    routing::get,
    Json, Router,
};
use tokio::{net::TcpListener, sync::RwLock};
use tower_http::cors::{Any, CorsLayer};
use tracing::instrument;

use crate::engine::Answers;

use super::{
    types::{GuessQuery, GuessResponse},
    HttpServerConfig, HttpServerError,
};

const GET_GUESS_RESPONSE_PATH: &str = "/get_guess_response";
const WAIT_BETWEEN_GUESS_RESPONSE_CHECKS_MS: u64 = 10;
const GUESS_RESPONSE_TIMEOUT_SEC: u64 = 15;

#[derive(Clone)]
pub struct HttpServerState {
    /// The answers to the guess queries.
    answers: Arc<RwLock<Answers>>,
}

/// Starts the HTTP server.
/// The server will listen on the provided address and will respond to the guess queries.
///
/// # Arguments
///
/// * `config` - The configuration for the HTTP server.
/// * `answers` - The answers to the guess queries.
/// * `shutdown_receiver` - The receiver for the shutdown signal.
pub async fn start_server(
    config: HttpServerConfig,
    answers: Arc<RwLock<Answers>>,
    mut shutdown_receiver: tokio::sync::watch::Receiver<bool>,
) -> Result<(), HttpServerError> {
    let tcp_listener = TcpListener::bind(config.service_bind_address).await?;
    let state = HttpServerState { answers };
    let router = create_router(state);
    let server =
        axum::serve(tcp_listener, router.into_make_service()).with_graceful_shutdown(async move {
            shutdown_receiver
                .changed()
                .await
                .expect("Error receiving shutdown signal")
        });
    server.await?;
    Ok(())
}

/// Creates the router for the HTTP server.
fn create_router(state: HttpServerState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![Method::GET])
        .allow_headers(Any);
    Router::new()
        .route(GET_GUESS_RESPONSE_PATH, get(get_guess_response_handler))
        .layer(cors)
        .with_state(state)
}

/// Handles the GET request for the guess response.
/// This function will wait for the response to be available and will return it.
#[instrument(level = "info", skip(state))]
async fn get_guess_response_handler(
    State(state): State<HttpServerState>,
    Query(query): Query<GuessQuery>,
) -> Result<axum::extract::Json<GuessResponse>, axum::http::StatusCode> {
    let start_time = std::time::Instant::now();
    loop {
        let answers = state.answers.read().await;
        let response = answers.get(&query.guess);
        if let Some(response) = response {
            break Ok(Json(GuessResponse {
                correct: response.correct,
                explanation: response.explanation.clone(),
            }));
        }
        drop(answers);
        tokio::time::sleep(std::time::Duration::from_millis(
            WAIT_BETWEEN_GUESS_RESPONSE_CHECKS_MS,
        ))
        .await;
        if start_time.elapsed().as_secs() > GUESS_RESPONSE_TIMEOUT_SEC {
            break Err(axum::http::StatusCode::NO_CONTENT);
        }
    }
}

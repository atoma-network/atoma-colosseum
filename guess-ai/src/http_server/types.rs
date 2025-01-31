use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
pub struct GuessQuery {
    /// The guess to evaluate.
    pub guess: u64,
    /// The guess game ID.
    pub guess_game_id: u64,
}

#[derive(Serialize, Debug)]
pub struct GuessResponse {
    /// The correct guess.
    pub correct: bool,
    /// The explanation for the guess.
    pub explanation: String,
}

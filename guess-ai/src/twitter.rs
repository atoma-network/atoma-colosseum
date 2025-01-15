use egg_mode::{tweet::DraftTweet, KeyPair, Token};
use thiserror::Error;
use tracing::{error, info, instrument};

type Result<T> = std::result::Result<T, TwitterError>;

pub struct TwitterClient {
    token: Token,
}

impl TwitterClient {
    /// Constructor
    pub fn new(
        consumer_key: String,
        consumer_secret: String,
        access_token: String,
        access_token_secret: String,
    ) -> Self {
        let consumer_token = KeyPair::new(consumer_key, consumer_secret);
        let access_token = KeyPair::new(access_token, access_token_secret);
        let token = Token::Access {
            consumer: consumer_token,
            access: access_token,
        };
        Self { token }
    }

    #[instrument(
        level = "info",
        skip(self),
        err,
        fields(
            message = %message
        )
    )]
    pub async fn post_tweet(&self, message: &'static str) -> Result<()> {
        let response = DraftTweet::new(message).send(&self.token).await?;
        info!(
            target = "twitter_client",
            event = "tweet-posted",
            "Tweet posted successfully: {message:?}, tweet id: {}, tweet data: {} from user: {:?}",
            response.id,
            response.text,
            response.user
        );
        Ok(())
    }

    #[instrument(
        level = "info",
        skip(self),
        err,
        fields(
            hint = %hint
        )
    )]
    pub async fn post_hint(&self, hint: &'static str) -> Result<()> {
        let response = DraftTweet::new(hint).send(&self.token).await?;
        info!(
            target = "twitter_client",
            event = "hint-posted",
            "Hint posted successfully: {hint:?}, hint id: {}, hint data: {} from user: {:?}",
            response.id,
            response.text,
            response.user
        );
        Ok(())
    }

    #[instrument(
        level = "info",
        skip(self),
        err,
        fields(
            message = %message,
            guess = %guess,
            sender = %sender,
            tx_digest = %tx_digest
        )
    )]
    pub async fn post_winner(
        &self,
        message: &str,
        guess: &str,
        sender: &str,
        tx_digest: &str,
    ) -> Result<()> {
        let message = format!(
            "The winner is {sender} with guess: {guess} and tx_digest: {tx_digest} !\n\n{message}"
        );
        let response = DraftTweet::new(message.clone()).send(&self.token).await?;
        info!(
            target = "twitter_client",
            event = "winner-posted",
            "Winner posted successfully: {message:?}, winner id: {}, winner data: {} from user: {:?}",
            response.id,
            response.text,
            response.user
        );
        Ok(())
    }
}

#[derive(Error, Debug)]
pub enum TwitterError {
    #[error("Twitter API error: {0}")]
    ApiError(String),
    #[error("Twitter API error: {0}")]
    EggModeError(#[from] egg_mode::error::Error),
}

use serde::{Deserialize, Serialize};
use tauri::command;
use sha2::{Sha256, Sha512, Sha384, Digest};
use sha1::Sha1;
use hmac::{Hmac, Mac};
use hex;

type HmacSha256 = Hmac<Sha256>;
type HmacSha384 = Hmac<Sha384>;
type HmacSha512 = Hmac<Sha512>;

#[command]
pub fn hash_text(text: String, algorithm: String) -> Result<String, String> {
    Ok(match algorithm.as_str() {
        "SHA-1" => {
            let mut h = Sha1::new();
            h.update(text.as_bytes());
            hex::encode(h.finalize())
        }
        "SHA-256" => {
            let mut h = Sha256::new();
            h.update(text.as_bytes());
            hex::encode(h.finalize())
        }
        "SHA-512" => {
            let mut h = Sha512::new();
            h.update(text.as_bytes());
            hex::encode(h.finalize())
        }
        _ => return Err(format!("Unknown algorithm: {}", algorithm)),
    })
}

#[command]
pub async fn hash_file(path: String, algorithm: String) -> Result<String, String> {
    let data = tokio::fs::read(&path).await.map_err(|e| e.to_string())?;
    Ok(match algorithm.as_str() {
        "SHA-1" => { let mut h = Sha1::new(); h.update(&data); hex::encode(h.finalize()) }
        "SHA-256" => { let mut h = Sha256::new(); h.update(&data); hex::encode(h.finalize()) }
        "SHA-512" => { let mut h = Sha512::new(); h.update(&data); hex::encode(h.finalize()) }
        _ => return Err(format!("Unknown algorithm: {}", algorithm)),
    })
}

#[command]
pub fn compute_hmac(key: String, message: String, algorithm: String) -> Result<String, String> {
    Ok(match algorithm.as_str() {
        "SHA-256" => {
            let mut mac = HmacSha256::new_from_slice(key.as_bytes()).map_err(|e| e.to_string())?;
            mac.update(message.as_bytes());
            hex::encode(mac.finalize().into_bytes())
        }
        "SHA-384" => {
            let mut mac = HmacSha384::new_from_slice(key.as_bytes()).map_err(|e| e.to_string())?;
            mac.update(message.as_bytes());
            hex::encode(mac.finalize().into_bytes())
        }
        "SHA-512" => {
            let mut mac = HmacSha512::new_from_slice(key.as_bytes()).map_err(|e| e.to_string())?;
            mac.update(message.as_bytes());
            hex::encode(mac.finalize().into_bytes())
        }
        _ => return Err(format!("Unknown algorithm: {}", algorithm)),
    })
}

#[derive(Serialize, Deserialize)]
pub struct BcryptResult {
    pub hash: String,
    pub cost: u32,
}

#[command]
pub fn bcrypt_hash(password: String, cost: u32) -> Result<BcryptResult, String> {
    let cost = cost.clamp(4, 14);
    let hash = bcrypt::hash(&password, cost).map_err(|e| e.to_string())?;
    Ok(BcryptResult { hash, cost })
}

#[command]
pub fn bcrypt_verify(password: String, hash: String) -> Result<bool, String> {
    bcrypt::verify(&password, &hash).map_err(|e| e.to_string())
}

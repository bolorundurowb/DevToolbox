use serde::{Deserialize, Serialize};
use tauri::command;
use sha2::{Sha256, Sha512, Sha384, Digest};
use sha1::Sha1;
use md5::Md5;
use crc32fast::Hasher as Crc32Hasher;
use hmac::{Hmac, Mac};
use hex;
use tokio::io::AsyncReadExt;

type HmacSha256 = Hmac<Sha256>;
type HmacSha384 = Hmac<Sha384>;
type HmacSha512 = Hmac<Sha512>;

fn hash_bytes(data: &[u8], algorithm: &str) -> Result<String, String> {
    Ok(match algorithm {
        "MD5" => {
            let mut h = Md5::new();
            h.update(data);
            hex::encode(h.finalize())
        }
        "SHA-1" => {
            let mut h = Sha1::new();
            h.update(data);
            hex::encode(h.finalize())
        }
        "SHA-256" => {
            let mut h = Sha256::new();
            h.update(data);
            hex::encode(h.finalize())
        }
        "SHA-512" => {
            let mut h = Sha512::new();
            h.update(data);
            hex::encode(h.finalize())
        }
        "CRC-32" => {
            let mut h = Crc32Hasher::new();
            h.update(data);
            format!("{:08x}", h.finalize())
        }
        _ => return Err(format!("Unknown algorithm: {}", algorithm)),
    })
}

#[command]
pub fn hash_text(text: String, algorithm: String) -> Result<String, String> {
    hash_bytes(text.as_bytes(), &algorithm)
}

#[command]
pub async fn hash_file(path: String, algorithm: String) -> Result<String, String> {
    let mut file = tokio::fs::File::open(&path).await.map_err(|e| e.to_string())?;
    let mut buffer = [0_u8; 64 * 1024];

    Ok(match algorithm.as_str() {
        "MD5" => {
            let mut h = Md5::new();
            loop {
                let read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
                if read == 0 { break; }
                h.update(&buffer[..read]);
            }
            hex::encode(h.finalize())
        }
        "SHA-1" => {
            let mut h = Sha1::new();
            loop {
                let read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
                if read == 0 { break; }
                h.update(&buffer[..read]);
            }
            hex::encode(h.finalize())
        }
        "SHA-256" => {
            let mut h = Sha256::new();
            loop {
                let read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
                if read == 0 { break; }
                h.update(&buffer[..read]);
            }
            hex::encode(h.finalize())
        }
        "SHA-512" => {
            let mut h = Sha512::new();
            loop {
                let read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
                if read == 0 { break; }
                h.update(&buffer[..read]);
            }
            hex::encode(h.finalize())
        }
        "CRC-32" => {
            let mut h = Crc32Hasher::new();
            loop {
                let read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
                if read == 0 { break; }
                h.update(&buffer[..read]);
            }
            format!("{:08x}", h.finalize())
        }
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

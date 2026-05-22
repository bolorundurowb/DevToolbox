use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageConvertOptions {
    pub input_path: String,
    pub output_dir: String,
    pub format: String,     // "PNG" | "JPG" | "WebP" | "AVIF"
    pub quality: u8,        // 0-100
    pub resize_width: Option<u32>,
    pub resize_height: Option<u32>,
    pub keep_aspect: bool,
    pub strip_metadata: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageConvertResult {
    pub output_path: String,
    pub input_size: u64,
    pub output_size: u64,
    pub width: u32,
    pub height: u32,
}

#[command]
pub async fn convert_image(options: ImageConvertOptions) -> Result<ImageConvertResult, String> {
    let input_path = PathBuf::from(&options.input_path);
    let input_size = std::fs::metadata(&input_path)
        .map_err(|e| e.to_string())?
        .len();

    let mut img = image::open(&input_path).map_err(|e| e.to_string())?;

    // Resize if requested
    if let (Some(w), Some(h)) = (options.resize_width, options.resize_height) {
        img = if options.keep_aspect {
            img.resize(w, h, image::imageops::FilterType::Lanczos3)
        } else {
            img.resize_exact(w, h, image::imageops::FilterType::Lanczos3)
        };
    }

    let (width, height) = (img.width(), img.height());
    let stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let ext = match options.format.as_str() {
        "JPG" | "JPEG" => "jpg",
        "WebP" => "webp",
        "AVIF" => "avif",
        _ => "png",
    };

    let output_path = PathBuf::from(&options.output_dir).join(format!("{}.{}", stem, ext));

    match options.format.as_str() {
        "JPG" | "JPEG" => {
            let rgb = img.to_rgb8();
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                std::fs::File::create(&output_path).map_err(|e| e.to_string())?,
                options.quality,
            );
            encoder.encode_image(&rgb).map_err(|e| e.to_string())?;
        }
        "WebP" => {
            img.save(&output_path).map_err(|e| e.to_string())?;
        }
        _ => {
            img.save(&output_path).map_err(|e| e.to_string())?;
        }
    }

    let output_size = std::fs::metadata(&output_path)
        .map_err(|e| e.to_string())?
        .len();

    Ok(ImageConvertResult {
        output_path: output_path.to_string_lossy().to_string(),
        input_size,
        output_size,
        width,
        height,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CropOptions {
    pub input_path: String,
    pub output_path: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub quality: u8,
}

#[command]
pub async fn crop_image(options: CropOptions) -> Result<ImageConvertResult, String> {
    let input_path = PathBuf::from(&options.input_path);
    let input_size = std::fs::metadata(&input_path)
        .map_err(|e| e.to_string())?
        .len();

    let img = image::open(&input_path).map_err(|e| e.to_string())?;
    let cropped = img.crop_imm(options.x, options.y, options.width, options.height);

    cropped.save(&options.output_path).map_err(|e| e.to_string())?;

    let output_size = std::fs::metadata(&options.output_path)
        .map_err(|e| e.to_string())?
        .len();

    Ok(ImageConvertResult {
        output_path: options.output_path,
        input_size,
        output_size,
        width: options.width,
        height: options.height,
    })
}

#[command]
pub async fn get_image_info(path: String) -> Result<serde_json::Value, String> {
    let img = image::open(&path).map_err(|e| e.to_string())?;
    let size = std::fs::metadata(&path).map_err(|e| e.to_string())?.len();
    Ok(serde_json::json!({
        "width": img.width(),
        "height": img.height(),
        "color": format!("{:?}", img.color()),
        "size_bytes": size,
    }))
}

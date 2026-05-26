use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct DllInfo {
    pub file_name:        String,
    pub file_version:     Option<String>,
    pub assembly_name:    Option<String>,
    pub assembly_version: Option<String>,
    pub is_dotnet:        bool,
}

#[command]
pub fn inspect_dll(path: String) -> Result<DllInfo, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Cannot read file: {e}"))?;
    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&path)
        .to_string();

    let pe = PeParser::new(&data).map_err(|e| format!("Not a valid PE file: {e}"))?;

    let file_version = file_version_from_resources(&pe);
    let (asm_name, asm_ver, is_dotnet) = assembly_info(&pe);

    Ok(DllInfo { file_name, file_version, assembly_name: asm_name, assembly_version: asm_ver, is_dotnet })
}

// ─── PE helpers ───────────────────────────────────────────────────────────────

struct Section {
    virtual_address: u32,
    virtual_size:    u32,
    raw_offset:      u32,
}

struct PeParser<'a> {
    data:               &'a [u8],
    is_64:              bool,
    opt_hdr_off:        usize,
    sections:           Vec<Section>,
}

impl<'a> PeParser<'a> {
    fn new(data: &'a [u8]) -> Result<Self, &'static str> {
        if data.len() < 64 { return Err("file too small"); }
        if ru16(data, 0) != 0x5A4D { return Err("missing MZ signature"); }

        let pe_off = ru32(data, 60) as usize;
        if pe_off + 24 > data.len() { return Err("bad PE offset"); }
        if ru32(data, pe_off) != 0x0000_4550 { return Err("missing PE\0\0 signature"); }

        let num_sections = ru16(data, pe_off + 6) as usize;
        let opt_hdr_size = ru16(data, pe_off + 20) as usize;
        let opt_hdr_off  = pe_off + 24;
        if opt_hdr_off + 2 > data.len() { return Err("truncated optional header"); }

        let magic = ru16(data, opt_hdr_off);
        let is_64 = match magic {
            0x010B => false,
            0x020B => true,
            _      => return Err("unrecognised optional header magic"),
        };

        let sections_off = opt_hdr_off + opt_hdr_size;
        let mut sections = Vec::with_capacity(num_sections);
        for i in 0..num_sections {
            let off = sections_off + i * 40;
            if off + 40 > data.len() { break; }
            sections.push(Section {
                virtual_size:    ru32(data, off + 8),
                virtual_address: ru32(data, off + 12),
                raw_offset:      ru32(data, off + 20),
            });
        }
        Ok(Self { data, is_64, opt_hdr_off, sections })
    }

    fn rva_to_file(&self, rva: u32) -> Option<usize> {
        for s in &self.sections {
            let end = s.virtual_address.saturating_add(s.virtual_size.max(1));
            if rva >= s.virtual_address && rva < end {
                return Some((rva - s.virtual_address + s.raw_offset) as usize);
            }
        }
        None
    }

    /// (VirtualAddress, Size) of data-directory entry `index`, or None if absent.
    fn data_dir(&self, index: usize) -> Option<(u32, u32)> {
        let dd_off = self.opt_hdr_off + if self.is_64 { 112 } else { 96 };
        let e = dd_off + index * 8;
        if e + 8 > self.data.len() { return None; }
        let rva  = ru32(self.data, e);
        let size = ru32(self.data, e + 4);
        if rva == 0 { None } else { Some((rva, size)) }
    }
}

// ─── File version via VS_VERSION_INFO ────────────────────────────────────────

fn file_version_from_resources(pe: &PeParser<'_>) -> Option<String> {
    let (res_rva, _) = pe.data_dir(2)?;            // data directory 2 = RESOURCE
    let res_base = pe.rva_to_file(res_rva)?;
    let data_rva = rt_version_data_rva(pe.data, res_base, res_base, 0)?;
    let off      = pe.rva_to_file(data_rva)?;
    decode_fixed_file_info(pe.data, off)
}

/// Walk the 3-level resource directory tree and return the data RVA for
/// the first RT_VERSION (type 16) leaf.
fn rt_version_data_rva(data: &[u8], res_base: usize, dir: usize, level: u32) -> Option<u32> {
    if dir + 16 > data.len() { return None; }
    let num_named = ru16(data, dir + 12) as usize;
    let num_id    = ru16(data, dir + 14) as usize;

    for i in 0..(num_named + num_id) {
        let entry      = dir + 16 + i * 8;
        if entry + 8 > data.len() { break; }
        let name_field = ru32(data, entry);
        let offs_field = ru32(data, entry + 4);

        // Level 0: only follow the RT_VERSION entry (ID 16, no named entries)
        if level == 0 && (name_field & 0x8000_0000 != 0 || name_field != 16) { continue; }

        if offs_field & 0x8000_0000 != 0 {
            // Sub-directory; offset is relative to res_base
            let sub = res_base + (offs_field & 0x7FFF_FFFF) as usize;
            if level < 2 {
                let r = rt_version_data_rva(data, res_base, sub, level + 1);
                if r.is_some() { return r; }
            } else {
                // level 2 → language sub-directory → one more hop
                return rt_version_data_rva(data, res_base, sub, level + 1);
            }
        } else if level >= 2 {
            // Leaf IMAGE_RESOURCE_DATA_ENTRY; offset is relative to res_base
            let de = res_base + offs_field as usize;
            if de + 4 > data.len() { return None; }
            return Some(ru32(data, de));   // DataRVA
        }
    }
    None
}

fn decode_fixed_file_info(data: &[u8], off: usize) -> Option<String> {
    // VS_VERSION_INFO:
    //   wLength(2) + wValueLength(2) + wType(2) + szKey("VS_VERSION_INFO\0" = 32 bytes)
    //   → 38 bytes, DWORD-aligned → 40 bytes before VS_FIXEDFILEINFO
    if off + 6 > data.len() { return None; }
    if ru16(data, off + 2) == 0 { return None; }   // wValueLength == 0 → no FIXEDFILEINFO

    let fixed = off + 40;
    if fixed + 20 > data.len() { return None; }
    if ru32(data, fixed) != 0xFEEF_04BD { return None; }   // VS_FIXEDFILEINFO.dwSignature

    let ms = ru32(data, fixed + 8);
    let ls = ru32(data, fixed + 12);
    Some(format!("{}.{}.{}.{}",
        (ms >> 16) & 0xFFFF,
         ms        & 0xFFFF,
        (ls >> 16) & 0xFFFF,
         ls        & 0xFFFF,
    ))
}

// ─── Assembly name & version via ECMA-335 metadata ───────────────────────────

fn assembly_info(pe: &PeParser<'_>) -> (Option<String>, Option<String>, bool) {
    // Data directory 14 = COM descriptor (CLR runtime header)
    let Some((cli_rva, _)) = pe.data_dir(14) else { return (None, None, false); };
    let Some(cli_off)      = pe.rva_to_file(cli_rva)  else { return (None, None, false); };

    // IMAGE_COR20_HEADER: cb(4)+Major(2)+Minor(2)+MetaData.RVA(4)+MetaData.Size(4)
    if cli_off + 16 > pe.data.len() { return (None, None, true); }
    let meta_rva = ru32(pe.data, cli_off + 8);
    let Some(meta_off) = pe.rva_to_file(meta_rva) else { return (None, None, true); };

    match parse_dotnet_metadata(pe.data, meta_off) {
        Some((name, ver)) => (Some(name), Some(ver), true),
        None              => (None, None, true),
    }
}

fn parse_dotnet_metadata(data: &[u8], meta: usize) -> Option<(String, String)> {
    // STORAGESIGNATURE: Sig(4)+Major(2)+Minor(2)+ExtraData(4)+VersionLength(4)+Version(n)
    if meta + 16 > data.len() { return None; }
    if ru32(data, meta) != 0x424A_5342 { return None; }   // "BSJB"

    let ver_len   = ru32(data, meta + 12) as usize;       // already 4-byte padded per spec
    let after_ver = meta + 16 + ver_len;
    if after_ver + 4 > data.len() { return None; }

    let num_streams = ru16(data, after_ver + 2) as usize;

    let mut tilde_off:   Option<usize> = None;
    let mut strings_off: Option<usize> = None;
    let mut cursor = after_ver + 4;

    for _ in 0..num_streams {
        if cursor + 8 > data.len() { break; }
        let rel        = ru32(data, cursor)     as usize;
        let name_start = cursor + 8;
        let name_end   = (name_start..data.len().min(name_start + 32))
            .find(|&i| data[i] == 0)
            .unwrap_or(name_start);
        let name = std::str::from_utf8(&data[name_start..name_end]).unwrap_or("");
        match name {
            "#~" | "#-" => tilde_off   = Some(meta + rel),
            "#Strings"  => strings_off = Some(meta + rel),
            _ => {}
        }
        let padded = ((name_end - name_start + 1) + 3) & !3;
        cursor = name_start + padded;
    }

    let tilde   = tilde_off?;
    let strings = strings_off?;

    // #~ stream: Reserved(4)+Major(1)+Minor(1)+HeapSizes(1)+Reserved(1)+Valid(8)+Sorted(8)
    if tilde + 24 > data.len() { return None; }
    let heap_sizes = data[tilde + 6];
    let valid      = ru64(data, tilde + 8);

    // Collect row counts
    let mut rc = [0u32; 64];
    let mut p  = tilde + 24;
    for bit in 0..64u64 {
        if (valid >> bit) & 1 == 1 {
            if p + 4 > data.len() { return None; }
            rc[bit as usize] = ru32(data, p);
            p += 4;
        }
    }

    // Skip tables 0x00..0x1F to reach the Assembly table (0x20)
    let mut offset = tilde + 24 + 4 * valid.count_ones() as usize;
    for t in 0x00usize..0x20 {
        if (valid >> t) & 1 == 0 { continue; }
        offset += rc[t] as usize * row_size(t, heap_sizes, &rc);
    }

    if (valid >> 0x20u64) & 1 == 0 { return None; }   // no Assembly table

    // Assembly row: HashAlgId(4)+Major(2)+Minor(2)+Build(2)+Revision(2)+Flags(4)
    //               +PublicKey(bi)+Name(si)+Culture(si)
    let si = if heap_sizes & 1 != 0 { 4usize } else { 2 };
    let bi = if heap_sizes & 4 != 0 { 4usize } else { 2 };
    if offset + 16 + bi + si > data.len() { return None; }

    let major    = ru16(data, offset + 4);
    let minor    = ru16(data, offset + 6);
    let build    = ru16(data, offset + 8);
    let revision = ru16(data, offset + 10);

    let name_idx = if si == 4 {
        ru32(data, offset + 16 + bi) as usize
    } else {
        ru16(data, offset + 16 + bi) as usize
    };

    let s = strings + name_idx;
    let e = (s..data.len().min(s + 512)).find(|&i| data[i] == 0).unwrap_or(s);
    let name = std::str::from_utf8(&data[s..e]).unwrap_or("").to_string();

    Some((name, format!("{major}.{minor}.{build}.{revision}")))
}

// ─── Row-size computation (ECMA-335 §II.22 + §II.24.2.6) ─────────────────────

fn row_size(table: usize, hs: u8, rc: &[u32; 64]) -> usize {
    let si = if hs & 1 != 0 { 4usize } else { 2 };
    let gi = if hs & 2 != 0 { 4usize } else { 2 };
    let bi = if hs & 4 != 0 { 4usize } else { 2 };

    // Coded index: 2 bytes unless max referenced row-count exceeds threshold
    let ci = |tables: &[usize], tag_bits: u32| -> usize {
        let limit = 1u32 << (16 - tag_bits);
        if tables.iter().any(|&t| rc[t] >= limit) { 4 } else { 2 }
    };
    // Simple index into a single table
    let ti = |t: usize| -> usize { if rc[t] > 65535 { 4 } else { 2 } };

    let tdef_ref   = ci(&[0x02, 0x01, 0x1B], 2);
    let has_const  = ci(&[0x04, 0x08, 0x17], 2);
    let has_ca     = ci(&[0x06,0x04,0x01,0x02,0x08,0x09,0x0A,0x00,
                          0x0E,0x17,0x14,0x11,0x1A,0x1B,0x20,0x23,
                          0x26,0x27,0x28], 5);
    let has_fm     = ci(&[0x04, 0x08], 1);
    let has_ds     = ci(&[0x02, 0x06, 0x20], 2);
    let mrp        = ci(&[0x02, 0x01, 0x1A, 0x06, 0x1B], 3);
    let has_sem    = ci(&[0x14, 0x17], 1);
    let mdr        = ci(&[0x06, 0x0A], 1);
    let mfwd       = ci(&[0x04, 0x06], 1);
    let cat        = ci(&[0x06, 0x0A], 3);
    let res_scope  = ci(&[0x00, 0x1A, 0x23, 0x01], 2);

    match table {
        0x00 => 2 + si + gi + gi + gi,                           // Module
        0x01 => res_scope + si + si,                             // TypeRef
        0x02 => 4 + si + si + tdef_ref + ti(0x04) + ti(0x06),   // TypeDef
        0x03 => ti(0x04),                                        // FieldPtr
        0x04 => 2 + si + bi,                                     // Field
        0x05 => ti(0x06),                                        // MethodPtr
        0x06 => 4 + 2 + 2 + si + bi + ti(0x08),                 // MethodDef
        0x07 => ti(0x08),                                        // ParamPtr
        0x08 => 2 + 2 + si,                                      // Param
        0x09 => ti(0x02) + tdef_ref,                             // InterfaceImpl
        0x0A => mrp + si + bi,                                   // MemberRef
        0x0B => 1 + 1 + has_const + bi,                         // Constant
        0x0C => has_ca + cat + bi,                               // CustomAttribute
        0x0D => has_fm + bi,                                     // FieldMarshal
        0x0E => 2 + has_ds + bi,                                 // DeclSecurity
        0x0F => 2 + 4 + ti(0x02),                               // ClassLayout
        0x10 => 4 + ti(0x04),                                   // FieldLayout
        0x11 => bi,                                              // StandAloneSig
        0x12 => ti(0x02) + ti(0x14),                            // EventMap
        0x13 => ti(0x14),                                        // EventPtr
        0x14 => 2 + si + tdef_ref,                              // Event
        0x15 => ti(0x02) + ti(0x17),                            // PropertyMap
        0x16 => ti(0x17),                                        // PropertyPtr
        0x17 => 2 + si + bi,                                     // Property
        0x18 => 2 + ti(0x06) + has_sem,                         // MethodSemantics
        0x19 => ti(0x02) + mdr + mdr,                           // MethodImpl
        0x1A => si,                                              // ModuleRef
        0x1B => bi,                                              // TypeSpec
        0x1C => 2 + mfwd + si + ti(0x1A),                       // ImplMap
        0x1D => 4 + ti(0x04),                                   // FieldRVA
        _    => 0,
    }
}

// ─── Byte-reading helpers ─────────────────────────────────────────────────────

#[inline] fn ru16(d: &[u8], o: usize) -> u16 { u16::from_le_bytes(d[o..o+2].try_into().unwrap()) }
#[inline] fn ru32(d: &[u8], o: usize) -> u32 { u32::from_le_bytes(d[o..o+4].try_into().unwrap()) }
#[inline] fn ru64(d: &[u8], o: usize) -> u64 { u64::from_le_bytes(d[o..o+8].try_into().unwrap()) }

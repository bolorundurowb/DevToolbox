export interface Tool {
  id: string;
  name: string;
  icon: string;
  desc: string;
  catId: string;
  catName: string;
  route: string;
  keywords?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  tools: Tool[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'text', name: 'Text & Code', icon: 'braces',
    tools: [
      { id: 'json',    name: 'JSON Formatter',  icon: 'braces',  desc: 'Pretty-print, minify, validate',     catId: 'text', catName: 'Text & Code', route: '/tools/json',         keywords: ['json', 'format', 'pretty', 'minify', 'lint'] },
      { id: 'xml',     name: 'XML Formatter',   icon: 'code',    desc: 'Indent, validate, XPath',            catId: 'text', catName: 'Text & Code', route: '/tools/xml',          keywords: ['xml', 'html', 'format', 'markup'] },
      { id: 'yaml',    name: 'YAML ↔ JSON',     icon: 'code',    desc: 'Convert between formats',            catId: 'text', catName: 'Text & Code', route: '/tools/yaml',         keywords: ['yaml', 'json', 'convert', 'yml'] },
      { id: 'sql',     name: 'SQL Formatter',   icon: 'code',    desc: 'Standard, MySQL, Postgres',          catId: 'text', catName: 'Text & Code', route: '/tools/sql',          keywords: ['sql', 'mysql', 'postgres', 'format', 'query'] },
      { id: 'js',      name: 'JS/TS Beautifier', icon: 'code',   desc: 'Prettier under the hood',            catId: 'text', catName: 'Text & Code', route: '/tools/js-beautify',  keywords: ['javascript', 'typescript', 'prettier', 'format', 'js', 'ts'] },
      { id: 'md',      name: 'Markdown Preview', icon: 'type',   desc: 'GFM with live render',               catId: 'text', catName: 'Text & Code', route: '/tools/markdown',     keywords: ['markdown', 'preview', 'md', 'render', 'gfm'] },
      { id: 'diff',    name: 'Diff Viewer',      icon: 'diff',   desc: 'Side-by-side or inline',             catId: 'text', catName: 'Text & Code', route: '/tools/diff',         keywords: ['diff', 'compare', 'changes', 'patch'] },
      { id: 'case',    name: 'Text Case',         icon: 'type',   desc: 'camelCase · snake_case · kebab-case', catId: 'text', catName: 'Text & Code', route: '/tools/text-case',   keywords: ['case', 'camel', 'snake', 'kebab', 'pascal', 'convert'] },
      { id: 'lorem',   name: 'Lorem Ipsum',       icon: 'type',   desc: 'Words, sentences, paragraphs',       catId: 'text', catName: 'Text & Code', route: '/tools/lorem',        keywords: ['lorem', 'ipsum', 'placeholder', 'dummy', 'text'] },
      { id: 'regex',   name: 'Regex Tester',      icon: 'regex',  desc: 'Live match, replace, explain',       catId: 'text', catName: 'Text & Code', route: '/tools/regex',        keywords: ['regex', 'regexp', 'pattern', 'match', 'test'] },
    ]
  },
  {
    id: 'encode', name: 'Encoding', icon: 'cube',
    tools: [
      { id: 'base64',  name: 'Base64',           icon: 'cube',    desc: 'Encode / decode text or file',      catId: 'encode', catName: 'Encoding', route: '/tools/base64',       keywords: ['base64', 'encode', 'decode'] },
      { id: 'url',     name: 'URL Encode',        icon: 'globe',   desc: 'Percent-encoding',                  catId: 'encode', catName: 'Encoding', route: '/tools/url-encode',   keywords: ['url', 'percent', 'encode', 'decode', 'uri'] },
      { id: 'html',    name: 'HTML Entities',     icon: 'code',    desc: '&amp; ↔ &#38;',                    catId: 'encode', catName: 'Encoding', route: '/tools/html-entities',keywords: ['html', 'entities', 'escape', 'encode'] },
      { id: 'jwt',     name: 'JWT Decoder',       icon: 'key',     desc: 'Inspect header & payload',          catId: 'encode', catName: 'Encoding', route: '/tools/jwt',          keywords: ['jwt', 'token', 'bearer', 'decode', 'payload', 'header'] },
      { id: 'hex',     name: 'Hex ↔ ASCII',       icon: 'hash',    desc: 'Byte-level conversion',             catId: 'encode', catName: 'Encoding', route: '/tools/hex',          keywords: ['hex', 'ascii', 'binary', 'convert', 'bytes'] },
    ]
  },
  {
    id: 'crypto', name: 'Hashing & Crypto', icon: 'lock',
    tools: [
      { id: 'hash',    name: 'Hash Generator',    icon: 'fingerprint', desc: 'MD5 · SHA-1/256/512',          catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/hash',          keywords: ['hash', 'md5', 'sha', 'sha256', 'sha512', 'checksum'] },
      { id: 'bcrypt',  name: 'Bcrypt',             icon: 'lock',    desc: 'Hash & verify passwords',          catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/bcrypt',        keywords: ['bcrypt', 'password', 'hash', 'verify'] },
      { id: 'uuid',    name: 'UUID Generator',     icon: 'hash',    desc: 'v1 · v4 · v7 · ULID',             catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/uuid',          keywords: ['uuid', 'guid', 'ulid', 'nanoid', 'id', 'generate'] },
      { id: 'pwd',     name: 'Password Generator', icon: 'key',     desc: 'Strong randomness, custom rules',  catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/password-gen',  keywords: ['password', 'generate', 'random', 'secure'] },
      { id: 'hmac',    name: 'HMAC',               icon: 'lock',    desc: 'Signed message digest',            catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/hmac',          keywords: ['hmac', 'mac', 'sign', 'digest', 'sha'] },
      { id: 'rsa',     name: 'RSA Key Generator',  icon: 'key',     desc: 'Generate RSA public/private key pairs', catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/rsa-keygen', keywords: ['rsa', 'key', 'generate', 'public', 'private', 'pem', 'ssh'] },
      { id: 'cert',    name: 'Certificate Decoder', icon: 'identification', desc: 'Decode PEM/DER certificates, CSRs', catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/cert-decoder', keywords: ['certificate', 'pem', 'der', 'ssl', 'tls', 'x509', 'csr', 'decode'] },
      { id: 'aes',     name: 'AES Encrypt/Decrypt', icon: 'lock-closed', desc: 'AES-GCM with passphrase or key', catId: 'crypto', catName: 'Hashing & Crypto', route: '/tools/aes', keywords: ['aes', 'encrypt', 'decrypt', 'symmetric', 'gcm', 'cipher'] },
    ]
  },
  {
    id: 'image', name: 'Images', icon: 'image',
    tools: [
      { id: 'img-convert', name: 'Image Converter', icon: 'image',   desc: 'PNG · JPG · WebP · AVIF',        catId: 'image', catName: 'Images', route: '/tools/img-converter',  keywords: ['image', 'convert', 'png', 'jpg', 'webp', 'avif', 'compress'] },
      { id: 'img-resize',  name: 'Image Resizer',   icon: 'resize',  desc: 'Batch, presets, aspect-lock',    catId: 'image', catName: 'Images', route: '/tools/img-resizer',    keywords: ['image', 'resize', 'scale', 'dimensions'] },
      { id: 'img-crop',    name: 'Image Cropper',   icon: 'crop',    desc: 'Manual + smart crop',            catId: 'image', catName: 'Images', route: '/tools/img-cropper',    keywords: ['image', 'crop', 'trim', 'cut'] },
      { id: 'svg-opt',     name: 'SVG Optimizer',   icon: 'image',   desc: 'Strip metadata, shrink paths',   catId: 'image', catName: 'Images', route: '/tools/svg-optimizer',  keywords: ['svg', 'optimize', 'compress', 'svgo'] },
      { id: 'color',         name: 'Color Tools',              icon: 'palette', desc: 'Convert, pick, contrast',                    catId: 'image', catName: 'Images', route: '/tools/color-tools',    keywords: ['color', 'hex', 'rgb', 'hsl', 'oklch', 'picker'] },
      { id: 'palette-gen',  name: 'Colour Palette Generator', icon: 'palette', desc: 'Tetradic, triadic, complementary & more',     catId: 'image', catName: 'Images', route: '/tools/color-palette',  keywords: ['color', 'palette', 'harmony', 'tetradic', 'triadic', 'complementary', 'analogous', 'monochromatic', 'split', 'tints', 'shades', 'hsl', 'generator'] },
    ]
  },
  {
    id: 'web', name: 'Web & Network', icon: 'globe',
    tools: [
      { id: 'cron',    name: 'Cron Parser',        icon: 'clock',   desc: 'Explain & preview schedules',     catId: 'web', catName: 'Web & Network', route: '/tools/cron',          keywords: ['cron', 'schedule', 'crontab', 'job'] },
      { id: 'unix',    name: 'Unix Time',           icon: 'clock',   desc: 'Epoch ↔ ISO ↔ local',            catId: 'web', catName: 'Web & Network', route: '/tools/unix-time',     keywords: ['unix', 'epoch', 'timestamp', 'date', 'time', 'iso'] },
      { id: 'qr',      name: 'QR Code',             icon: 'qr',      desc: 'Generate · decode from image',   catId: 'web', catName: 'Web & Network', route: '/tools/qr',            keywords: ['qr', 'qrcode', 'barcode', 'generate'] },
      { id: 'cidr',    name: 'IP / CIDR',           icon: 'globe',   desc: 'Subnet calculator',              catId: 'web', catName: 'Web & Network', route: '/tools/ip-cidr',       keywords: ['ip', 'cidr', 'subnet', 'network', 'ipv4', 'ipv6'] },
      { id: 'ua',      name: 'User-Agent Parser',   icon: 'eye',     desc: 'OS · browser · device',          catId: 'web', catName: 'Web & Network', route: '/tools/user-agent',    keywords: ['user-agent', 'ua', 'browser', 'os', 'device', 'parse'] },
      { id: 'curl',    name: 'cURL to Code',         icon: 'code-bracket', desc: 'Convert curl to fetch / axios / requests', catId: 'web', catName: 'Web & Network', route: '/tools/curl-to-code', keywords: ['curl', 'fetch', 'axios', 'requests', 'http', 'convert', 'code'] },
      { id: 'openapi', name: 'OpenAPI Viewer',       icon: 'document',     desc: 'View Swagger / OpenAPI specs locally', catId: 'web', catName: 'Web & Network', route: '/tools/openapi-viewer', keywords: ['openapi', 'swagger', 'rest', 'api', 'documentation', 'spec'] },
    ]
  },
  {
    id: 'transform', name: 'Data Transform', icon: 'code-bracket',
    tools: [
      { id: 'csv-json',    name: 'CSV ↔ JSON / XML',      icon: 'code-bracket', desc: 'Convert tabular data between formats', catId: 'transform', catName: 'Data Transform', route: '/tools/csv-json',    keywords: ['csv', 'json', 'xml', 'convert', 'table', 'data'] },
      { id: 'json-toml',   name: 'JSON ↔ TOML',           icon: 'code-bracket', desc: 'Convert between JSON and TOML config', catId: 'transform', catName: 'Data Transform', route: '/tools/json-toml',   keywords: ['json', 'toml', 'cargo', 'config', 'convert'] },
      { id: 'json-schema', name: 'JSON Schema Generator', icon: 'document',     desc: 'Generate schema from sample JSON',     catId: 'transform', catName: 'Data Transform', route: '/tools/json-schema', keywords: ['json', 'schema', 'generate', 'draft', 'validate'] },
    ]
  },
  {
    id: 'utils', name: 'Utilities', icon: 'cog',
    tools: [
      { id: 'unit-conv',  name: 'Unit Converter',         icon: 'hashtag',      desc: 'Data storage & time unit conversion',  catId: 'utils', catName: 'Utilities', route: '/tools/unit-converter',  keywords: ['unit', 'convert', 'bytes', 'kb', 'mb', 'gb', 'ms', 'seconds', 'minutes'] },
      { id: 'base-conv',  name: 'Number Base Converter',  icon: 'hash',         desc: 'Binary · Octal · Decimal · Hex', catId: 'utils', catName: 'Utilities', route: '/tools/base-converter',  keywords: ['binary', 'octal', 'decimal', 'hex', 'hexadecimal', 'base', 'convert', 'number'] },
      { id: 'mock-data',  name: 'Mock Data Generator',    icon: 'identification', desc: 'Fake names, emails, addresses',       catId: 'utils', catName: 'Utilities', route: '/tools/mock-data',       keywords: ['mock', 'fake', 'data', 'name', 'email', 'address', 'generate', 'test'] },
      { id: 'str-escape', name: 'String Escaper',         icon: 'code-bracket', desc: 'Escape/unescape for Java, Python, C#…', catId: 'utils', catName: 'Utilities', route: '/tools/string-escaper',  keywords: ['escape', 'unescape', 'string', 'java', 'python', 'csharp', 'javascript', 'go'] },
    ]
  },
];

export const ALL_TOOLS: Tool[] = CATEGORIES.flatMap(c =>
  c.tools.map(t => ({ ...t, catId: c.id, catName: c.name }))
);

export const TOOL_BY_ID: Record<string, Tool> = Object.fromEntries(
  ALL_TOOLS.map(t => [t.id, t])
);

export function searchTools(query: string): Tool[] {
  if (!query.trim()) return ALL_TOOLS;
  const q = query.toLowerCase();
  return ALL_TOOLS.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.desc.toLowerCase().includes(q) ||
    t.catName.toLowerCase().includes(q) ||
    (t.keywords || []).some(k => k.includes(q))
  );
}

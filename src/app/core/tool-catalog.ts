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
      { id: 'yaml',    name: 'YAML / JSON Converter', icon: 'code', desc: 'Convert YAML and JSON',          catId: 'text', catName: 'Text & Code', route: '/tools/yaml',         keywords: ['yaml', 'json', 'convert', 'yml'] },
      { id: 'sql',     name: 'SQL Formatter',   icon: 'code',    desc: 'Standard, MySQL, Postgres',          catId: 'text', catName: 'Text & Code', route: '/tools/sql',          keywords: ['sql', 'mysql', 'postgres', 'format', 'query'] },
      { id: 'js',      name: 'Code Beautifier',  icon: 'code',   desc: 'Format JavaScript, TypeScript, CSS, and HTML', catId: 'text', catName: 'Text & Code', route: '/tools/js-beautify',  keywords: ['javascript', 'typescript', 'prettier', 'format', 'js', 'ts', 'css', 'html'] },
      { id: 'md',      name: 'Markdown Preview', icon: 'type',   desc: 'GFM with live render',               catId: 'text', catName: 'Text & Code', route: '/tools/markdown',     keywords: ['markdown', 'preview', 'md', 'render', 'gfm'] },
      { id: 'diff',    name: 'Diff Viewer',      icon: 'diff',   desc: 'Side-by-side or inline',             catId: 'text', catName: 'Text & Code', route: '/tools/diff',         keywords: ['diff', 'compare', 'changes', 'patch'] },
      { id: 'case',    name: 'Text Case',         icon: 'type',   desc: 'camelCase · snake_case · kebab-case', catId: 'text', catName: 'Text & Code', route: '/tools/text-case',   keywords: ['case', 'camel', 'snake', 'kebab', 'pascal', 'convert'] },
      { id: 'lorem',   name: 'Lorem Ipsum',       icon: 'type',   desc: 'Words, sentences, paragraphs',       catId: 'text', catName: 'Text & Code', route: '/tools/lorem',        keywords: ['lorem', 'ipsum', 'placeholder', 'dummy', 'text'] },
      { id: 'regex',   name: 'Regex Tester',      icon: 'regex',  desc: 'Live match, replace, explain',       catId: 'text', catName: 'Text & Code', route: '/tools/regex',        keywords: ['regex', 'regexp', 'pattern', 'match', 'test'] },
    ]
  },
  {
    id: 'encode', name: 'Encoding & Decoding', icon: 'cube',
    tools: [
      { id: 'base64',  name: 'Base64 Encoder/Decoder', icon: 'cube', desc: 'Encode or decode text and files', catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/base64',       keywords: ['base64', 'encode', 'decode'] },
      { id: 'url',     name: 'URL Encoder/Decoder', icon: 'globe', desc: 'Percent-encode and decode URLs',    catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/url-encode',   keywords: ['url', 'percent', 'encode', 'decode', 'uri'] },
      { id: 'html',    name: 'HTML Entities Encoder/Decoder', icon: 'code', desc: 'Escape and unescape entities', catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/html-entities',keywords: ['html', 'entities', 'escape', 'encode', 'decode'] },
      { id: 'jwt',         name: 'JWT Decoder',       icon: 'key',     desc: 'Inspect header and payload',        catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/jwt',          keywords: ['jwt', 'token', 'bearer', 'decode', 'payload', 'header'] },
      { id: 'jwt-builder', name: 'JWT Builder',       icon: 'key',     desc: 'Mint and sign tokens with WebCrypto', catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/jwt-builder',  keywords: ['jwt', 'token', 'bearer', 'sign', 'build', 'mint', 'hs256', 'hmac', 'payload', 'header'] },
      { id: 'hex',     name: 'Hex / ASCII Converter', icon: 'hash', desc: 'Convert bytes and text',           catId: 'encode', catName: 'Encoding & Decoding', route: '/tools/hex',          keywords: ['hex', 'ascii', 'binary', 'convert', 'bytes'] },
    ]
  },
  {
    id: 'crypto', name: 'Crypto', icon: 'lock',
    tools: [
      { id: 'hash',    name: 'Hash Generator',    icon: 'fingerprint', desc: 'MD5, CRC-32, SHA-1, SHA-2',    catId: 'crypto', catName: 'Crypto', route: '/tools/hash',          keywords: ['hash', 'md5', 'sha', 'sha256', 'sha512', 'checksum', 'crc'] },
      { id: 'bcrypt',  name: 'Bcrypt Password Hash', icon: 'lock', desc: 'Hash and verify passwords',        catId: 'crypto', catName: 'Crypto', route: '/tools/bcrypt',        keywords: ['bcrypt', 'password', 'hash', 'verify'] },
      { id: 'uuid',    name: 'UUID Generator',     icon: 'hash',    desc: 'v1, v4, v7, ULID, and Nano ID',    catId: 'crypto', catName: 'Crypto', route: '/tools/uuid',          keywords: ['uuid', 'guid', 'ulid', 'nanoid', 'id', 'generate'] },
      { id: 'pwd',     name: 'Password Generator', icon: 'key',     desc: 'Strong randomness and custom rules', catId: 'crypto', catName: 'Crypto', route: '/tools/password-gen',  keywords: ['password', 'generate', 'random', 'secure'] },
      { id: 'hmac',    name: 'HMAC Generator',     icon: 'shield-check', desc: 'Signed message digest',       catId: 'crypto', catName: 'Crypto', route: '/tools/hmac',          keywords: ['hmac', 'mac', 'sign', 'digest', 'sha'] },
      { id: 'rsa',     name: 'RSA Key Generator',  icon: 'key',     desc: 'Generate RSA public/private key pairs', catId: 'crypto', catName: 'Crypto', route: '/tools/rsa-keygen', keywords: ['rsa', 'key', 'generate', 'public', 'private', 'pem', 'ssh'] },
      { id: 'cert',    name: 'Certificate Decoder', icon: 'identification', desc: 'Decode PEM/DER certificates and CSRs', catId: 'crypto', catName: 'Crypto', route: '/tools/cert-decoder', keywords: ['certificate', 'pem', 'der', 'ssl', 'tls', 'x509', 'csr', 'decode'] },
      { id: 'aes',     name: 'AES Encryptor/Decryptor', icon: 'lock-closed', desc: 'AES-GCM with passphrase or key', catId: 'crypto', catName: 'Crypto', route: '/tools/aes', keywords: ['aes', 'encrypt', 'decrypt', 'symmetric', 'gcm', 'cipher'] },
    ]
  },
  {
    id: 'image', name: 'Images', icon: 'image',
    tools: [
      { id: 'img-convert', name: 'Image Converter', icon: 'image',   desc: 'PNG · JPG · WebP · AVIF',        catId: 'image', catName: 'Images', route: '/tools/img-converter',  keywords: ['image', 'convert', 'png', 'jpg', 'webp', 'avif', 'compress'] },
      { id: 'img-resize',  name: 'Image Resizer',   icon: 'resize',  desc: 'Batch, presets, aspect-lock',    catId: 'image', catName: 'Images', route: '/tools/img-resizer',    keywords: ['image', 'resize', 'scale', 'dimensions'] },
      { id: 'img-crop',    name: 'Image Cropper',   icon: 'crop',    desc: 'Manual + smart crop',            catId: 'image', catName: 'Images', route: '/tools/img-cropper',    keywords: ['image', 'crop', 'trim', 'cut'] },
      { id: 'svg-opt',     name: 'SVG Optimizer',   icon: 'svg',     desc: 'Strip metadata and shrink paths', catId: 'image', catName: 'Images', route: '/tools/svg-optimizer',  keywords: ['svg', 'optimize', 'compress', 'svgo'] },
      { id: 'svg-export',  name: 'SVG Exporter',    icon: 'svg',     desc: 'Preview SVG and export PNG/JPEG', catId: 'image', catName: 'Images', route: '/tools/svg-exporter', keywords: ['svg', 'export', 'png', 'jpeg', 'jpg', 'rasterize', 'convert'] },
      { id: 'color',         name: 'Color Tools',              icon: 'palette', desc: 'Convert, pick, contrast',                    catId: 'image', catName: 'Images', route: '/tools/color-tools',    keywords: ['color', 'hex', 'rgb', 'hsl', 'oklch', 'picker'] },
      { id: 'palette-gen',  name: 'Color Palette Generator', icon: 'palette', desc: 'Tetradic, triadic, complementary, and more',     catId: 'image', catName: 'Images', route: '/tools/color-palette',  keywords: ['color', 'colour', 'palette', 'harmony', 'tetradic', 'triadic', 'complementary', 'analogous', 'monochromatic', 'split', 'tints', 'shades', 'hsl', 'generator'] },
    ]
  },
  {
    id: 'web', name: 'Web & Network', icon: 'globe',
    tools: [
      { id: 'cron',    name: 'Cron Parser',        icon: 'calendar', desc: 'Explain and preview schedules',   catId: 'web', catName: 'Web & Network', route: '/tools/cron',          keywords: ['cron', 'schedule', 'crontab', 'job'] },
      { id: 'unix',         name: 'Unix Time Converter', icon: 'clock', desc: 'Convert epoch, ISO, and local time',            catId: 'web', catName: 'Web & Network', route: '/tools/unix-time',     keywords: ['unix', 'epoch', 'timestamp', 'date', 'time', 'iso'] },
      { id: 'datetime-util', name: 'Date & Time',        icon: 'calendar', desc: 'UTC · timezones · formats · precision',      catId: 'web', catName: 'Web & Network', route: '/tools/datetime-util', keywords: ['date', 'time', 'datetime', 'utc', 'timezone', 'iso', 'rfc', 'unix', 'format', 'precision', 'milliseconds', 'microseconds'] },
      { id: 'qr',      name: 'QR Code Generator',   icon: 'qr',      desc: 'Generate and decode QR codes',   catId: 'web', catName: 'Web & Network', route: '/tools/qr',            keywords: ['qr', 'qrcode', 'barcode', 'generate', 'decode'] },
      { id: 'cidr',    name: 'IP / CIDR Calculator', icon: 'network', desc: 'Calculate subnets and ranges',  catId: 'web', catName: 'Web & Network', route: '/tools/ip-cidr',       keywords: ['ip', 'cidr', 'subnet', 'network', 'ipv4', 'ipv6'] },
      { id: 'ua',      name: 'User-Agent Parser',   icon: 'eye',     desc: 'OS · browser · device',          catId: 'web', catName: 'Web & Network', route: '/tools/user-agent',    keywords: ['user-agent', 'ua', 'browser', 'os', 'device', 'parse'] },
      { id: 'curl',        name: 'cURL to Code',        icon: 'terminal',  desc: 'Convert curl to fetch / axios / requests', catId: 'web', catName: 'Web & Network', route: '/tools/curl-to-code',  keywords: ['curl', 'fetch', 'axios', 'requests', 'http', 'convert', 'code'] },
      { id: 'openapi',     name: 'OpenAPI Viewer',      icon: 'document',  desc: 'View Swagger / OpenAPI specs locally',     catId: 'web', catName: 'Web & Network', route: '/tools/openapi-viewer', keywords: ['openapi', 'swagger', 'rest', 'api', 'documentation', 'spec'] },
      { id: 'http-status', name: 'HTTP Status Codes',   icon: 'globe',     desc: 'Reference for all 1xx–5xx codes',          catId: 'web', catName: 'Web & Network', route: '/tools/http-status',    keywords: ['http', 'status', 'code', '404', '200', '500', 'rfc', 'reference', 'api'] },
    ]
  },
  {
    id: 'transform', name: 'Data Transform', icon: 'code-bracket',
    tools: [
      { id: 'csv-json',    name: 'CSV / JSON / XML Converter', icon: 'database', desc: 'Convert tabular data between formats', catId: 'transform', catName: 'Data Transform', route: '/tools/csv-json',    keywords: ['csv', 'json', 'xml', 'convert', 'table', 'data'] },
      { id: 'json-toml',   name: 'JSON / TOML Converter', icon: 'database', desc: 'Convert JSON and TOML config', catId: 'transform', catName: 'Data Transform', route: '/tools/json-toml',   keywords: ['json', 'toml', 'cargo', 'config', 'convert'] },
      { id: 'json-schema', name: 'JSON Schema Generator', icon: 'document',     desc: 'Generate schema from sample JSON',     catId: 'transform', catName: 'Data Transform', route: '/tools/json-schema', keywords: ['json', 'schema', 'generate', 'draft', 'validate'] },
    ]
  },
  {
    id: 'dotnet', name: '.NET', icon: 'cpu-chip',
    tools: [
      { id: 'dll-inspector', name: 'DLL Inspector',          icon: 'cpu-chip', desc: 'Assembly name, assembly version, file version', catId: 'dotnet', catName: '.NET', route: '/tools/dll-inspector', keywords: ['dll', 'exe', 'dotnet', '.net', 'assembly', 'version', 'pe', 'clr', 'inspect'] },
      { id: 'nuget-tree',    name: 'NuGet Dependency Tree',  icon: 'share',    desc: 'Full transitive dependency tree across target frameworks', catId: 'dotnet', catName: '.NET', route: '/tools/nuget-tree',    keywords: ['nuget', 'package', 'dependency', 'tree', 'dotnet', '.net', 'csharp', 'framework', 'transitive'] },
    ]
  },
  {
    id: 'utils', name: 'Utilities', icon: 'cog',
    tools: [
      { id: 'unit-conv',   name: 'Unit Converter',         icon: 'hashtag',        desc: 'Data storage & time unit conversion',      catId: 'utils', catName: 'Utilities', route: '/tools/unit-converter',  keywords: ['unit', 'convert', 'bytes', 'kb', 'mb', 'gb', 'ms', 'seconds', 'minutes'] },
      { id: 'base-conv',   name: 'Number Base Converter',  icon: 'hash',           desc: 'Binary · Octal · Decimal · Hex',           catId: 'utils', catName: 'Utilities', route: '/tools/base-converter',  keywords: ['binary', 'octal', 'decimal', 'hex', 'hexadecimal', 'base', 'convert', 'number'] },
      { id: 'bitwise',     name: 'Bitwise Calculator',     icon: 'code-bracket',   desc: 'AND/OR/XOR/shift with multi-base display', catId: 'utils', catName: 'Utilities', route: '/tools/bitwise',         keywords: ['bitwise', 'binary', 'and', 'or', 'xor', 'not', 'shift', 'shl', 'shr', 'bit', 'calculator'] },
      { id: 'unix-perms',  name: 'Unix Permissions',       icon: 'lock',      desc: 'Convert rwx, octal, setuid, sticky bit',   catId: 'utils', catName: 'Utilities', route: '/tools/unix-perms',      keywords: ['unix', 'permissions', 'chmod', 'rwx', 'octal', 'setuid', 'setgid', 'sticky', 'linux', '755', '644'] },
      { id: 'mock-data',   name: 'Mock Data Generator',    icon: 'identification', desc: 'Fake names, emails, addresses',            catId: 'utils', catName: 'Utilities', route: '/tools/mock-data',       keywords: ['mock', 'fake', 'data', 'name', 'email', 'address', 'generate', 'test'] },
      { id: 'str-escape',  name: 'String Escaper',         icon: 'braces',         desc: 'Escape/unescape for Java, Python, C#…',   catId: 'utils', catName: 'Utilities', route: '/tools/string-escaper',  keywords: ['escape', 'unescape', 'string', 'java', 'python', 'csharp', 'javascript', 'go'] },
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

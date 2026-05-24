import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface StatusCode {
  code: number;
  name: string;
  desc: string;
  rfc: string;
  uses: string[];
}

const STATUS_CODES: StatusCode[] = [
  // 1xx Informational
  {
    code: 100,
    name: 'Continue',
    desc: 'The server has received the request headers and the client should proceed to send the request body. Used to avoid sending large request bodies when the server might reject the request.',
    rfc: 'RFC 9110 §15.2.1',
    uses: ['Large upload pre-check', 'Expect: 100-continue header', 'POST body negotiation'],
  },
  {
    code: 101,
    name: 'Switching Protocols',
    desc: 'The server agrees to switch protocols as requested by the client via the Upgrade header. Commonly used to upgrade an HTTP connection to WebSocket.',
    rfc: 'RFC 9110 §15.2.2',
    uses: ['WebSocket upgrade', 'HTTP/2 upgrade', 'Protocol negotiation'],
  },
  {
    code: 102,
    name: 'Processing',
    desc: 'An interim response indicating the server has received and is processing the request, but no response is available yet. Prevents the client from timing out.',
    rfc: 'RFC 2518 §10.1',
    uses: ['Long-running WebDAV operations', 'Async processing feedback', 'Timeout prevention'],
  },
  {
    code: 103,
    name: 'Early Hints',
    desc: 'Allows the server to send preliminary response headers before the final response, enabling the client to preload resources while the server prepares the full response.',
    rfc: 'RFC 8297',
    uses: ['Resource preloading', 'Link preconnect hints', 'Performance optimization'],
  },

  // 2xx Success
  {
    code: 200,
    name: 'OK',
    desc: 'The request succeeded. The response body contains the requested resource or the result of the action depending on the HTTP method used.',
    rfc: 'RFC 9110 §15.3.1',
    uses: ['GET resource fetch', 'POST action success', 'PUT/PATCH update success'],
  },
  {
    code: 201,
    name: 'Created',
    desc: 'The request succeeded and a new resource was created as a result. The Location header typically contains the URI of the newly created resource.',
    rfc: 'RFC 9110 §15.3.2',
    uses: ['POST new record', 'Resource creation APIs', 'File upload success'],
  },
  {
    code: 202,
    name: 'Accepted',
    desc: 'The request has been accepted for processing, but processing has not been completed. The request may or may not eventually be acted upon.',
    rfc: 'RFC 9110 §15.3.3',
    uses: ['Async job submission', 'Queue-based processing', 'Batch operation initiation'],
  },
  {
    code: 203,
    name: 'Non-Authoritative Information',
    desc: 'The request succeeded but the response body has been modified by a transforming proxy from the origin server\'s 200 OK response.',
    rfc: 'RFC 9110 §15.3.4',
    uses: ['Proxy-transformed content', 'Cached modified responses', 'Mirror server responses'],
  },
  {
    code: 204,
    name: 'No Content',
    desc: 'The request succeeded but there is no content to send in the response body. The headers may still be useful.',
    rfc: 'RFC 9110 §15.3.5',
    uses: ['DELETE success', 'PUT with no response body', 'Ping/heartbeat endpoints'],
  },
  {
    code: 205,
    name: 'Reset Content',
    desc: 'The request succeeded and the client should reset the document view that caused the request to be sent.',
    rfc: 'RFC 9110 §15.3.6',
    uses: ['Form submission clear', 'Input reset after submit', 'UI state reset signal'],
  },
  {
    code: 206,
    name: 'Partial Content',
    desc: 'The server is delivering only part of the resource due to a Range header sent by the client. Used for resumable downloads and streaming.',
    rfc: 'RFC 9110 §15.3.7',
    uses: ['Resumable file downloads', 'Video/audio streaming', 'Range-based pagination'],
  },
  {
    code: 207,
    name: 'Multi-Status',
    desc: 'A WebDAV response that conveys information about multiple resources when multiple status codes might be appropriate.',
    rfc: 'RFC 4918 §11.1',
    uses: ['WebDAV batch operations', 'Bulk API responses', 'Multi-resource status'],
  },
  {
    code: 208,
    name: 'Already Reported',
    desc: 'Used in WebDAV to avoid enumerating internal members of bindings multiple times when their bindings are infinite.',
    rfc: 'RFC 5842 §7.1',
    uses: ['WebDAV DAV:propstat', 'Binding loop prevention', 'Collection member deduplication'],
  },
  {
    code: 226,
    name: 'IM Used',
    desc: 'The server fulfilled a GET request and the response is a representation of one or more instance-manipulations applied to the current instance.',
    rfc: 'RFC 3229 §10.4.1',
    uses: ['HTTP delta encoding', 'Instance manipulation', 'Differential content delivery'],
  },

  // 3xx Redirection
  {
    code: 300,
    name: 'Multiple Choices',
    desc: 'The request has more than one possible response. The user-agent or user should choose one. The server may indicate a preferred choice in a Location header.',
    rfc: 'RFC 9110 §15.4.1',
    uses: ['Content negotiation', 'Multiple format options', 'Language selection'],
  },
  {
    code: 301,
    name: 'Moved Permanently',
    desc: 'The requested resource has been permanently moved to the URL given in the Location header. Browsers and crawlers update their references.',
    rfc: 'RFC 9110 §15.4.2',
    uses: ['Permanent URL change', 'Domain migration', 'SEO-safe redirects'],
  },
  {
    code: 302,
    name: 'Found',
    desc: 'The requested resource temporarily resides at a different URI. The client should use the original URI for future requests.',
    rfc: 'RFC 9110 §15.4.3',
    uses: ['Temporary redirects', 'Post/Redirect/Get pattern', 'Login flow redirect'],
  },
  {
    code: 303,
    name: 'See Other',
    desc: 'The server is redirecting the client to a different resource using a GET request. Typically used after a POST to redirect to a confirmation page.',
    rfc: 'RFC 9110 §15.4.4',
    uses: ['Post/Redirect/Get', 'Form submission result', 'REST action redirect'],
  },
  {
    code: 304,
    name: 'Not Modified',
    desc: 'Indicates that the resource has not been modified since the version specified by the request headers If-Modified-Since or If-None-Match.',
    rfc: 'RFC 9110 §15.4.5',
    uses: ['Browser cache validation', 'ETag conditional GET', 'Bandwidth optimization'],
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    desc: 'The requested resource is temporarily located at a different URI. Unlike 302, the request method must not change when following the redirect.',
    rfc: 'RFC 9110 §15.4.8',
    uses: ['Method-preserving temp redirect', 'POST redirect without GET', 'HSTS upgrade'],
  },
  {
    code: 308,
    name: 'Permanent Redirect',
    desc: 'The resource has been permanently moved and the request method must not change. Similar to 301 but preserves the HTTP method.',
    rfc: 'RFC 9110 §15.4.9',
    uses: ['Permanent method-preserving redirect', 'API endpoint migration', 'HTTPS enforcement'],
  },

  // 4xx Client Errors
  {
    code: 400,
    name: 'Bad Request',
    desc: 'The server cannot or will not process the request due to malformed syntax, invalid framing, or deceptive request routing.',
    rfc: 'RFC 9110 §15.5.1',
    uses: ['Malformed JSON body', 'Invalid query parameters', 'Schema validation failure'],
  },
  {
    code: 401,
    name: 'Unauthorized',
    desc: 'The client must authenticate itself to get the requested response. The WWW-Authenticate header describes the authentication scheme to use.',
    rfc: 'RFC 9110 §15.5.2',
    uses: ['Missing auth token', 'Expired JWT/session', 'API key not provided'],
  },
  {
    code: 402,
    name: 'Payment Required',
    desc: 'Reserved for future use. Informally used by some services to indicate a payment or subscription is required to access the resource.',
    rfc: 'RFC 9110 §15.5.3',
    uses: ['Paywalled content', 'Subscription required', 'Quota exceeded (informal)'],
  },
  {
    code: 403,
    name: 'Forbidden',
    desc: 'The server understood the request but refuses to authorize it. Unlike 401, re-authenticating will not help; the client lacks permission.',
    rfc: 'RFC 9110 §15.5.4',
    uses: ['Insufficient permissions', 'IP blocklist', 'Role-based access denial'],
  },
  {
    code: 404,
    name: 'Not Found',
    desc: 'The server cannot find the requested resource. The URL is not recognized, or the resource does not exist at that path.',
    rfc: 'RFC 9110 §15.5.5',
    uses: ['Missing resource', 'Deleted record', 'Typo in URL path'],
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    desc: 'The HTTP method is known but not supported for the target resource. The Allow header lists the supported methods.',
    rfc: 'RFC 9110 §15.5.6',
    uses: ['POST on read-only endpoint', 'DELETE not supported', 'Method restriction enforcement'],
  },
  {
    code: 406,
    name: 'Not Acceptable',
    desc: 'The server cannot produce a response matching the list of acceptable values defined by the client\'s Accept headers.',
    rfc: 'RFC 9110 §15.5.7',
    uses: ['Unsupported content type', 'Accept header mismatch', 'Language not available'],
  },
  {
    code: 407,
    name: 'Proxy Authentication Required',
    desc: 'The client must first authenticate itself with a proxy server. Similar to 401 but authentication is needed for the proxy, not the origin server.',
    rfc: 'RFC 9110 §15.5.8',
    uses: ['Corporate proxy auth', 'Forward proxy credentials', 'Proxy-Authenticate challenge'],
  },
  {
    code: 408,
    name: 'Request Timeout',
    desc: 'The server would like to shut down this unused connection. The client did not produce a request within the time the server was prepared to wait.',
    rfc: 'RFC 9110 §15.5.9',
    uses: ['Idle connection cleanup', 'Slow client timeout', 'Keep-alive timeout'],
  },
  {
    code: 409,
    name: 'Conflict',
    desc: 'The request could not be completed due to a conflict with the current state of the target resource, such as an edit conflict.',
    rfc: 'RFC 9110 §15.5.10',
    uses: ['Optimistic locking failure', 'Duplicate resource creation', 'Version conflict'],
  },
  {
    code: 410,
    name: 'Gone',
    desc: 'The target resource is no longer available and this condition is likely to be permanent. Differs from 404 in that the resource previously existed.',
    rfc: 'RFC 9110 §15.5.11',
    uses: ['Permanently deleted resource', 'Decommissioned API endpoint', 'Expired content'],
  },
  {
    code: 411,
    name: 'Length Required',
    desc: 'The server refuses to accept the request without a defined Content-Length header. The client should retry with the header included.',
    rfc: 'RFC 9110 §15.5.12',
    uses: ['Missing Content-Length', 'Upload without size', 'Chunked transfer not supported'],
  },
  {
    code: 412,
    name: 'Precondition Failed',
    desc: 'One or more conditions given in the request header fields evaluated to false when tested on the server, such as If-Match or If-Unmodified-Since.',
    rfc: 'RFC 9110 §15.5.13',
    uses: ['Conditional PUT failure', 'ETag mismatch on update', 'Optimistic concurrency control'],
  },
  {
    code: 413,
    name: 'Content Too Large',
    desc: 'The request body is larger than limits defined by the server; the server may close the connection or return a Retry-After header.',
    rfc: 'RFC 9110 §15.5.14',
    uses: ['File upload size limit', 'Request body too large', 'Payload size enforcement'],
  },
  {
    code: 414,
    name: 'URI Too Long',
    desc: 'The URI requested by the client is longer than the server is willing to interpret.',
    rfc: 'RFC 9110 §15.5.15',
    uses: ['Excessively long query string', 'GET with large parameters', 'URL length enforcement'],
  },
  {
    code: 415,
    name: 'Unsupported Media Type',
    desc: 'The media format of the requested data is not supported by the server, so the server is rejecting the request.',
    rfc: 'RFC 9110 §15.5.16',
    uses: ['Wrong Content-Type header', 'Unsupported file format', 'JSON expected, XML sent'],
  },
  {
    code: 416,
    name: 'Range Not Satisfiable',
    desc: 'The range specified in the Range header cannot be fulfilled; it is possible that the range is outside the size of the target URI\'s data.',
    rfc: 'RFC 9110 §15.5.17',
    uses: ['Invalid byte range request', 'Range beyond file size', 'Resumable download error'],
  },
  {
    code: 417,
    name: 'Expectation Failed',
    desc: 'The expectation indicated by the Expect request-header field cannot be met by the server.',
    rfc: 'RFC 9110 §15.5.18',
    uses: ['Expect: 100-continue rejected', 'Server capability mismatch', 'Conditional request failure'],
  },
  {
    code: 418,
    name: "I'm a Teapot",
    desc: 'Any attempt to brew coffee with a teapot should result in the error code 418. This code was defined as an April Fools\' joke in 1998 and is retained as an easter egg.',
    rfc: 'RFC 2324 §2.3.2',
    uses: ["April Fools' RFC easter egg", 'Humorous error responses', 'Rejecting inappropriate requests'],
  },
  {
    code: 421,
    name: 'Misdirected Request',
    desc: 'The request was directed at a server that is not able to produce a response. This can be sent by a server that is not configured to produce responses for the combination of scheme and authority.',
    rfc: 'RFC 9110 §15.5.20',
    uses: ['SNI misconfiguration', 'HTTP/2 connection reuse error', 'Wrong virtual host'],
  },
  {
    code: 422,
    name: 'Unprocessable Content',
    desc: 'The server understands the content type and syntax is correct, but it was unable to process the contained instructions due to semantic errors.',
    rfc: 'RFC 9110 §15.5.21',
    uses: ['Validation errors in body', 'Semantic constraint failure', 'Business rule violation'],
  },
  {
    code: 423,
    name: 'Locked',
    desc: 'The source or destination resource of a WebDAV method is locked and the request did not contain a valid lock token.',
    rfc: 'RFC 4918 §11.3',
    uses: ['WebDAV resource lock', 'Pessimistic locking', 'Concurrent edit prevention'],
  },
  {
    code: 424,
    name: 'Failed Dependency',
    desc: 'The method could not be performed on the resource because the requested action depended on another action that failed.',
    rfc: 'RFC 4918 §11.4',
    uses: ['WebDAV batch failure', 'Dependent operation error', 'Cascading failure in batch'],
  },
  {
    code: 425,
    name: 'Too Early',
    desc: 'The server is unwilling to risk processing a request that might be replayed, to avoid potential replay attacks in TLS early data.',
    rfc: 'RFC 8470 §5.2',
    uses: ['TLS 1.3 0-RTT replay protection', 'Early data rejection', 'Anti-replay enforcement'],
  },
  {
    code: 426,
    name: 'Upgrade Required',
    desc: 'The server refuses to perform the request using the current protocol but might be willing after the client upgrades to a different protocol.',
    rfc: 'RFC 9110 §15.5.22',
    uses: ['TLS upgrade required', 'HTTP/2 required', 'Protocol version enforcement'],
  },
  {
    code: 428,
    name: 'Precondition Required',
    desc: 'The origin server requires the request to be conditional, typically to prevent the "lost update" problem where a client GETs a resource, modifies it, and PUTs it back without checking for intermediate changes.',
    rfc: 'RFC 6585 §3',
    uses: ['Mandatory If-Match header', 'Optimistic locking enforcement', 'Safe update pattern'],
  },
  {
    code: 429,
    name: 'Too Many Requests',
    desc: 'The user has sent too many requests in a given amount of time. The Retry-After header may indicate how long to wait before making a new request.',
    rfc: 'RFC 6585 §4',
    uses: ['Rate limiting', 'API throttling', 'DDoS mitigation'],
  },
  {
    code: 431,
    name: 'Request Header Fields Too Large',
    desc: 'The server is unwilling to process the request because its header fields are too large. The request may be resubmitted after reducing the size of the request header fields.',
    rfc: 'RFC 6585 §5',
    uses: ['Oversized cookie headers', 'Too many headers', 'Header size enforcement'],
  },
  {
    code: 451,
    name: 'Unavailable For Legal Reasons',
    desc: 'The server is denying access to the resource as a consequence of a legal demand, such as a government-ordered block or court injunction.',
    rfc: 'RFC 7725 §3',
    uses: ['DMCA takedown', 'Government-mandated block', 'Court-ordered content removal'],
  },

  // 5xx Server Errors
  {
    code: 500,
    name: 'Internal Server Error',
    desc: 'The server encountered an unexpected condition that prevented it from fulfilling the request. A generic catch-all for server-side errors.',
    rfc: 'RFC 9110 §15.6.1',
    uses: ['Unhandled exception', 'Application crash', 'Database error'],
  },
  {
    code: 501,
    name: 'Not Implemented',
    desc: 'The server does not support the functionality required to fulfill the request, such as an HTTP method it does not recognize or support.',
    rfc: 'RFC 9110 §15.6.2',
    uses: ['Unsupported HTTP method', 'Unimplemented feature', 'Future endpoint placeholder'],
  },
  {
    code: 502,
    name: 'Bad Gateway',
    desc: 'The server, while acting as a gateway or proxy, received an invalid response from an upstream server.',
    rfc: 'RFC 9110 §15.6.3',
    uses: ['Upstream server error', 'Proxy invalid response', 'Microservice failure'],
  },
  {
    code: 503,
    name: 'Service Unavailable',
    desc: 'The server is not ready to handle the request. Common causes include temporary overloading or maintenance. A Retry-After header may indicate when to retry.',
    rfc: 'RFC 9110 §15.6.4',
    uses: ['Server maintenance', 'Overload/traffic spike', 'Circuit breaker open'],
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    desc: 'The server, while acting as a gateway or proxy, did not get a timely response from an upstream server needed to complete the request.',
    rfc: 'RFC 9110 §15.6.5',
    uses: ['Upstream timeout', 'Slow backend service', 'Load balancer timeout'],
  },
  {
    code: 505,
    name: 'HTTP Version Not Supported',
    desc: 'The HTTP version used in the request is not supported by the server.',
    rfc: 'RFC 9110 §15.6.6',
    uses: ['HTTP/0.9 or 1.0 rejected', 'Version negotiation failure', 'Protocol version enforcement'],
  },
  {
    code: 506,
    name: 'Variant Also Negotiates',
    desc: 'The server has an internal configuration error: the chosen variant resource is configured to engage in transparent content negotiation itself, creating a circular reference.',
    rfc: 'RFC 2295 §8.1',
    uses: ['Content negotiation loop', 'Misconfigured transparent negotiation', 'Recursive variant error'],
  },
  {
    code: 507,
    name: 'Insufficient Storage',
    desc: 'The method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request.',
    rfc: 'RFC 4918 §11.5',
    uses: ['Disk full on server', 'WebDAV storage limit', 'Quota exceeded server-side'],
  },
  {
    code: 508,
    name: 'Loop Detected',
    desc: 'The server detected an infinite loop while processing a WebDAV request that involves multiple resources.',
    rfc: 'RFC 5842 §7.2',
    uses: ['WebDAV infinite loop', 'Circular resource references', 'Depth-infinity loop'],
  },
  {
    code: 510,
    name: 'Not Extended',
    desc: 'Further extensions to the request are required for the server to fulfil it.',
    rfc: 'RFC 2774 §7',
    uses: ['Missing HTTP extension', 'Required extension not sent', 'Extension negotiation failure'],
  },
  {
    code: 511,
    name: 'Network Authentication Required',
    desc: 'The client needs to authenticate to gain network access, typically used by captive portals intercepting HTTP traffic.',
    rfc: 'RFC 6585 §6',
    uses: ['Captive portal redirect', 'Wi-Fi login required', 'Network access control'],
  },
];

function getClassColor(code: number): { color: string; bg: string } {
  const cls = Math.floor(code / 100);
  switch (cls) {
    case 1: return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
    case 2: return { color: '#16a34a', bg: 'rgba(22,163,74,0.12)' };
    case 3: return { color: '#d97706', bg: 'rgba(217,119,6,0.12)' };
    case 4: return { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' };
    case 5: return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' };
    default: return { color: 'var(--text)', bg: 'var(--surface-muted)' };
  }
}

@Component({
  selector: 'dt-tool-http-status',
  standalone: true,
  imports: [TopbarComponent, IconComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .tool-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--bg);
    }

    .controls {
      padding: 12px 16px 0;
      background: var(--bg);
    }

    .search-bar {
      position: relative;
      margin-bottom: 12px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      padding: 9px 12px 9px 38px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: var(--maroon);
    }

    .search-input::placeholder {
      color: var(--text-faint);
    }

    .tabs {
      display: flex;
      gap: 4px;
      padding-bottom: 12px;
      overflow-x: auto;
    }

    .tab-btn {
      padding: 5px 14px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-family: var(--font-ui);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .tab-btn:hover {
      background: var(--surface-muted);
      color: var(--text);
    }

    .tab-btn.active {
      background: var(--maroon-soft);
      color: var(--maroon);
      border-color: var(--maroon);
    }

    .tab-btn.tab-1xx.active { background: rgba(59,130,246,0.12); color: #3b82f6; border-color: #3b82f6; }
    .tab-btn.tab-2xx.active { background: rgba(22,163,74,0.12); color: #16a34a; border-color: #16a34a; }
    .tab-btn.tab-3xx.active { background: rgba(217,119,6,0.12); color: #d97706; border-color: #d97706; }
    .tab-btn.tab-4xx.active { background: rgba(220,38,38,0.12); color: #dc2626; border-color: #dc2626; }
    .tab-btn.tab-5xx.active { background: rgba(124,58,237,0.12); color: #7c3aed; border-color: #7c3aed; }

    .sticky-tabs {
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 10;
      padding: 0 16px;
      border-bottom: 1px solid var(--border);
    }

    .list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 48px 16px;
      color: var(--text-faint);
      font-family: var(--font-ui);
      font-size: 14px;
    }

    .code-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      overflow: hidden;
    }

    .code-card:hover {
      border-color: var(--maroon);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .code-card.expanded {
      border-color: var(--maroon);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 14px;
    }

    .code-badge {
      flex-shrink: 0;
      min-width: 62px;
      padding: 6px 10px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      text-align: center;
    }

    .card-meta {
      flex: 1;
      min-width: 0;
    }

    .card-title-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .code-name {
      font-family: var(--font-ui);
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .rfc-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-faint);
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
    }

    .card-desc {
      margin-top: 4px;
      font-family: var(--font-ui);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .card-desc.truncated {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .uses-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .use-chip {
      font-family: var(--font-ui);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      background: var(--surface-muted);
      white-space: nowrap;
    }

    .expand-icon {
      flex-shrink: 0;
      color: var(--text-faint);
      margin-top: 2px;
      transition: transform 0.2s;
    }

    .expand-icon.rotated {
      transform: rotate(180deg);
    }

    .card-expanded-body {
      padding: 0 14px 14px 14px;
      border-top: 1px solid var(--border);
      margin-top: 0;
    }

    .expanded-section {
      padding-top: 12px;
    }

    .expanded-desc {
      font-family: var(--font-ui);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 10px;
    }

    .expanded-rfc {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--maroon);
      background: var(--maroon-soft);
      border: 1px solid var(--maroon);
      border-radius: 6px;
      padding: 3px 10px;
      margin-bottom: 10px;
    }

    .uses-label {
      font-family: var(--font-ui);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-faint);
      margin-bottom: 6px;
    }

    .count-badge {
      font-family: var(--font-ui);
      font-size: 12px;
      color: var(--text-faint);
      padding: 2px 8px;
      align-self: center;
    }
  `],
  template: `
    <dt-topbar [crumbs]="['Web & Network', 'HTTP Status Codes']" toolId="http-status" />

    <div class="tool-wrapper">
      <div class="controls">
        <div class="search-bar">
          <span class="search-icon">
            <dt-icon name="search" [size]="16" />
          </span>
          <input
            class="search-input"
            type="text"
            placeholder="Search by code or name…"
            [ngModel]="search()" (ngModelChange)="search.set($event)"
          />
        </div>
      </div>

      <div class="sticky-tabs">
        <div class="tabs">
          <button
            class="tab-btn"
            [class.active]="activeClass() === ''"
            (click)="activeClass.set('')"
          >All</button>
          <button
            class="tab-btn tab-1xx"
            [class.active]="activeClass() === '1'"
            (click)="activeClass.set('1')"
          >1xx Informational</button>
          <button
            class="tab-btn tab-2xx"
            [class.active]="activeClass() === '2'"
            (click)="activeClass.set('2')"
          >2xx Success</button>
          <button
            class="tab-btn tab-3xx"
            [class.active]="activeClass() === '3'"
            (click)="activeClass.set('3')"
          >3xx Redirection</button>
          <button
            class="tab-btn tab-4xx"
            [class.active]="activeClass() === '4'"
            (click)="activeClass.set('4')"
          >4xx Client Error</button>
          <button
            class="tab-btn tab-5xx"
            [class.active]="activeClass() === '5'"
            (click)="activeClass.set('5')"
          >5xx Server Error</button>
        </div>
      </div>

      <div class="list">
        @if (filtered().length === 0) {
          <div class="empty-state">
            <dt-icon name="search-x" [size]="32" />
            <span>No status codes match your search.</span>
          </div>
        }

        @for (item of filtered(); track item.code) {
          <div
            class="code-card"
            [class.expanded]="selectedCode() === item.code"
            (click)="toggleCode(item.code)"
          >
            <div class="card-header">
              <div
                class="code-badge"
                [style.color]="classColor(item.code).color"
                [style.background]="classColor(item.code).bg"
              >{{ item.code }}</div>

              <div class="card-meta">
                <div class="card-title-row">
                  <span class="code-name">{{ item.name }}</span>
                  <span class="rfc-tag">{{ item.rfc }}</span>
                </div>
                <div class="card-desc" [class.truncated]="selectedCode() !== item.code">
                  {{ item.desc }}
                </div>
                @if (selectedCode() !== item.code) {
                  <div class="uses-row">
                    @for (use of item.uses; track use) {
                      <span class="use-chip">{{ use }}</span>
                    }
                  </div>
                }
              </div>

              <div class="expand-icon" [class.rotated]="selectedCode() === item.code">
                <dt-icon name="chevron-down" [size]="16" />
              </div>
            </div>

            @if (selectedCode() === item.code) {
              <div class="card-expanded-body">
                <div class="expanded-section">
                  <div class="expanded-rfc">
                    <dt-icon name="book-open" [size]="12" />
                    {{ item.rfc }}
                  </div>
                  <div class="uses-label">Common Uses</div>
                  <div class="uses-row">
                    @for (use of item.uses; track use) {
                      <span
                        class="use-chip"
                        [style.color]="classColor(item.code).color"
                        [style.borderColor]="classColor(item.code).color"
                        [style.background]="classColor(item.code).bg"
                      >{{ use }}</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class HttpStatusComponent {
  readonly search = signal('');
  readonly activeClass = signal<'' | '1' | '2' | '3' | '4' | '5'>('');
  readonly selectedCode = signal<number | null>(null);

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const cls = this.activeClass();

    return STATUS_CODES.filter((item) => {
      const clsMatch =
        cls === '' || Math.floor(item.code / 100) === Number(cls);
      if (!clsMatch) return false;

      if (query === '') return true;

      return (
        item.code.toString().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
      );
    });
  });

  classColor(code: number): { color: string; bg: string } {
    return getClassColor(code);
  }

  toggleCode(code: number): void {
    this.selectedCode.update((current) => (current === code ? null : code));
  }
}

// SSE lines/events do not align with network chunks. CR, LF and CRLF are valid.
export function createSSEParser(onEvent, onRetry = () => {}, initialId = '') {
  let line = '', skipLF = false, data = [], type = '', id = initialId;
  function acceptLine() {
    // A blank line dispatches the accumulated data; event IDs persist across subsequent events.
    if (line === '') {
      if (data.length) onEvent({ type: type || 'message', data: data.join('\n'), id });
      data = []; type = '';
    } else if (!line.startsWith(':')) {
      // Colon-prefixed lines are comments; data fields are joined with newlines.
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      let value = colon < 0 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'data') data.push(value);
      if (field === 'event') type = value;
      if (field === 'id' && !value.includes('\0')) id = value;
      if (field === 'retry' && /^\d+$/.test(value)) onRetry(Number(value));
    }
    line = '';
  }
  return text => {
    for (const char of text) {
      // Remember CR across input chunks so a split CRLF counts as one line ending.
      if (skipLF) { skipLF = false; if (char === '\n') continue; }
      if (char === '\r' || char === '\n') { acceptLine(); skipLF = char === '\r'; }
      else line += char;
    }
  };
}

export async function readSSE(response, onEvent, onRetry, initialId = '') {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const parse = createSSEParser(onEvent, onRetry, initialId);
  try {
    while (true) {
      const { value, done } = await reader.read(); // Waits for bytes, not a full response.
      if (done) { parse(decoder.decode()); break; }
      parse(decoder.decode(value, { stream: true })); // Preserve split UTF-8 characters.
    }
    // An event without its terminating blank line is incomplete and discarded.
  } finally {
    // Release the stream on parser errors or interruption as well as normal completion.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

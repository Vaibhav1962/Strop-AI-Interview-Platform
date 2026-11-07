"""Incremental JSON dialogue extractor for streaming LLM outputs.

Extracts the string contents of "assistant_response" on the fly from a
fragmented JSON stream, correctly handling:
- Arbitrary chunk boundaries
- Escaped quotes and backslashes
- Common JSON escapes (\\n, \\t, etc.)
- Unicode escapes (\\uXXXX) including surrogate pairs (\\uD83D\\uDE00)
- Preserves raw UTF-8 Unicode
- Ignores surrounding JSON syntax and delta_metadata
"""

from typing import Optional


class IncrementalDialogueExtractor:
    """Stateful parser that incrementally extracts only the dialogue text

    from the `assistant_response` field of an incoming JSON stream.
    """

    SEEKING_KEY = 0
    SEEKING_COLON = 1
    SEEKING_START_QUOTE = 2
    IN_VALUE = 3
    DONE = 4

    def __init__(self, target_key: str = "assistant_response"):
        self.target_key = target_key
        self.state = self.SEEKING_KEY
        self.raw_buffer: str = ""
        self.escape_buffer: str = ""
        self.high_surrogate: Optional[int] = None
        self.extracted_text: list[str] = []

    def feed_token(self, chunk: str) -> str:
        """Alias for feed(chunk) for token streaming."""
        return self.feed(chunk)

    def feed(self, chunk: str) -> str:
        """Feed an arbitrary chunk of characters from the LLM stream.

        Returns only the newly decoded dialogue text characters (if any).
        """
        if not chunk or self.state == self.DONE:
            return ""

        output_chars: list[str] = []
        i = 0
        n = len(chunk)

        while i < n:
            ch = chunk[i]

            if self.state == self.SEEKING_KEY:
                self.raw_buffer += ch
                key_pattern = f'"{self.target_key}"'
                pos = self.raw_buffer.find(key_pattern)
                if pos != -1:
                    self.state = self.SEEKING_COLON
                    self.raw_buffer = ""
                elif len(self.raw_buffer) > 200:
                    self.raw_buffer = self.raw_buffer[-50:]
                i += 1

            elif self.state == self.SEEKING_COLON:
                if ch == ":":
                    self.state = self.SEEKING_START_QUOTE
                # Whitespace between key and colon is ignored
                i += 1

            elif self.state == self.SEEKING_START_QUOTE:
                if ch == '"':
                    self.state = self.IN_VALUE
                    self.escape_buffer = ""
                    self.high_surrogate = None
                # Whitespace between colon and opening quote is ignored
                i += 1

            elif self.state == self.IN_VALUE:
                if self.escape_buffer:
                    self.escape_buffer += ch
                    i += 1

                    if self.escape_buffer.startswith("\\u"):
                        if len(self.escape_buffer) == 6:
                            hex_str = self.escape_buffer[2:]
                            try:
                                cp = int(hex_str, 16)
                                if 0xD800 <= cp <= 0xDBFF:
                                    # High surrogate, buffer and wait for low surrogate
                                    self.high_surrogate = cp
                                elif 0xDC00 <= cp <= 0xDFFF and self.high_surrogate is not None:
                                    # Low surrogate, combine
                                    full_cp = 0x10000 + ((self.high_surrogate - 0xD800) << 10) + (cp - 0xDC00)
                                    output_chars.append(chr(full_cp))
                                    self.high_surrogate = None
                                else:
                                    if self.high_surrogate is not None:
                                        # Lone high surrogate
                                        output_chars.append(chr(self.high_surrogate))
                                        self.high_surrogate = None
                                    output_chars.append(chr(cp))
                            except ValueError:
                                output_chars.append(self.escape_buffer)
                            self.escape_buffer = ""
                    else:
                        esc = self.escape_buffer[1]
                        if esc == '"':
                            output_chars.append('"')
                        elif esc == '\\':
                            output_chars.append('\\')
                        elif esc == '/':
                            output_chars.append('/')
                        elif esc == 'b':
                            output_chars.append('\b')
                        elif esc == 'f':
                            output_chars.append('\f')
                        elif esc == 'n':
                            output_chars.append('\n')
                        elif esc == 'r':
                            output_chars.append('\r')
                        elif esc == 't':
                            output_chars.append('\t')
                        elif esc == 'u':
                            # Keep buffering until 6 characters total (\\uXXXX)
                            continue
                        else:
                            # Unknown escape sequence; pass through
                            output_chars.append(esc)
                        self.escape_buffer = ""
                else:
                    if ch == '\\':
                        # Start of escape sequence
                        self.escape_buffer = "\\"
                        i += 1
                    elif ch == '"':
                        # Unescaped quote ends the dialogue string value
                        self.state = self.DONE
                        i += 1
                        break
                    else:
                        output_chars.append(ch)
                        i += 1

            elif self.state == self.DONE:
                break

        res = "".join(output_chars)
        if res:
            self.extracted_text.append(res)
        return res

    def flush(self) -> str:
        """Flushes any pending characters left in buffers at stream completion."""
        out: list[str] = []
        if self.high_surrogate is not None:
            out.append(chr(self.high_surrogate))
            self.high_surrogate = None
        if self.escape_buffer:
            out.append(self.escape_buffer)
            self.escape_buffer = ""
        res = "".join(out)
        if res:
            self.extracted_text.append(res)
        return res

    @property
    def full_extracted_text(self) -> str:
        return "".join(self.extracted_text)

    def is_done(self) -> bool:
        return self.state == self.DONE


var k = {
  End:        0x01
  // Single character tokens
  Dot:        0x10,
  Comma:      0x11,
  Colon:      0x12,
  ParenOpen:  0x13,
  ParenClose: 0x14,
  BraceOpen:  0x15,
  BraceClose: 0x16,
  ArrayOpen:  0x17,
  ArrayClose: 0x19,
}

// convert a string script into a stream of token events.
exports.lex = function lex(code, filename, onToken, onError) {
  var offset_ = 0;
  var length_ = code.length;

  function has(num) {
    return length_ - offset_ > num;
  }

  function get(i) {
    return code[offset_ + i];
  }

  while (offset_ < length_) {

    // One-line comment
    if (has(2) && get(0) == '/' && get(1) == '/') {
      offset_ += 2;
      while (has(1) && get(0) != '\r' && get(0) != '\n') offset_++;
    }

    // Multi-line comment
    if (has(2) && get(0) == '/' && get(1) == '*') {
      offset_ += 2;
      while (has(2) && get(0) != '*' && get(1) != '/') {
        // Skip escaped chars
        if (has(2) && get(0) == '\\') {
          offset_ += 2;
        } else {
          // Or skip a regular char
          offset_++;
        }
      }
      offset_ += 2;
    }

    if (offset_ == length_) return new Token(kEnd, offset_);


    var type = k.End;
    switch (code[offset_]) {
      case '.':
        type = k.Dot;
        break;
      case ',':
        type = k.Comma;
        break;
      case ':':
        type = k.Colon;
        break;
      case '(':
        type = k.ParenOpen;
        break;
      case ')':
        type = k.ParenClose;
        break;
      case '{':
        type = k.BraceOpen;
        break;
      case '}':
        type = k.BraceClose;
        break;
      case '[':
        type = k.ArrayOpen;
        break;
      case ']':
        type = k.ArrayClose;
        break;
      default:
        break;
    }
    console.log(char);
    index++;
  }

}
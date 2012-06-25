var candor = exports;

// Export lexer/parser
candor.lexer = require('./candor/lexer').Lexer;
candor.parser = require('./candor/parser').Parser;

// Export compiler
candor.compiler = require('./candor/compiler').Compiler;

// Export API
candor.translate = require('./candor/api').translate;
candor.run = require('./candor/api').run;

describe("DSLisp tokenizer", function() {
  var DSLisp = require('../../lib/DSLisp.js')
  var lisp;

  beforeEach(function() {
    lisp = new DSLisp();
  });

  it("should tokenize simple expr", function() {
    var tokens = lisp.tokenize("(define x 12)");
    expect(tokens).toEqual(["(", "define", "x", "12", ")"]);
  });

  it("should consider asterisks as part of the token", function() {
    var tokens = lisp.tokenize("(define *x* 12)");
    expect(tokens).toEqual(["(", "define", "*x*", "12", ")"]);
  });

  it("should consider question mark as part of the token", function() {
    var tokens = lisp.tokenize("(define x? 12)");
    expect(tokens).toEqual(["(", "define", "x?", "12", ")"]);
  });

  it("should consider arrows as part of the token", function() {
    var tokens = lisp.tokenize("(define x->y 12)");
    expect(tokens).toEqual(["(", "define", "x->y", "12", ")"]);
  });

  it("should consider quotes as part of the token", function() {
    var tokens = lisp.tokenize("(foo \"test\")");
    expect(tokens).toEqual(["(", "foo", "\"test\"", ")"]);
  });

  it("should handle single quote", function() {
    var tokens = lisp.tokenize("'foo");
    expect(tokens).toEqual(["'", "foo"]);

    var tokens = lisp.tokenize("'foo'bar");
    expect(tokens).toEqual(["'", "foo", "'", "bar"]);
  });

  // TODO: implement correct string handling in tokenizer and uncomment this test
  /*
  it("should handle quoted strings", function() {
    var tokens = lisp.tokenize("'foo'bar \"'foo'bar\"");
    expect(tokens).toEqual(["'", "foo", "'", "bar", "\"'foo'bar\""]);
  });
  */

});

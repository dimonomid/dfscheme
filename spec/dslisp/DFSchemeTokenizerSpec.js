describe("DFScheme tokenizer", function() {
  var DFScheme = require('../../lib/DFScheme.js')
  var lisp;

  beforeEach(function() {
    lisp = new DFScheme();
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

  it("should handle true and false", function() {
    var tokens = lisp.tokenize("#t #f");
    expect(tokens).toEqual(["#t", "#f"]);
  });

  it("should handle single quote", function() {
    var tokens = lisp.tokenize("'foo");
    expect(tokens).toEqual(["'", "foo"]);

    var tokens = lisp.tokenize("'foo'bar");
    expect(tokens).toEqual(["'", "foo", "'", "bar"]);
  });

  it("should tokenize quoted expr", function() {
    var tokens = lisp.tokenize('(define x "foo")');
    expect(tokens).toEqual(["(", "define", "x", '"foo"', ")"]);

    var tokens = lisp.tokenize('(define x "foo bar")');
    expect(tokens).toEqual(["(", "define", "x", '"foo bar"', ")"]);

    var tokens = lisp.tokenize('(define x "(define x hey)")');
    expect(tokens).toEqual(["(", "define", "x", '"(define x hey)"', ")"]);
  });

  // TODO: implement correct string handling in tokenizer and uncomment this test
  /*
  it("should handle quoted strings", function() {
    var tokens = lisp.tokenize("'foo'bar \"'foo'bar\"");
    expect(tokens).toEqual(["'", "foo", "'", "bar", "\"'foo'bar\""]);
  });
  */

});

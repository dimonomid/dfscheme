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

});

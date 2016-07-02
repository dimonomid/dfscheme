describe("DSLisp stringify", function() {
  var DSLisp = require('../../lib/DSLisp.js')
  var lisp;

  beforeEach(function() {
    lisp = new DSLisp();
  });

  it("should hanlde simple expr", function() {
    var str = lisp.stringify(lisp.parse(lisp.tokenize("(foo bar baz)")).car);
    expect(str).toEqual("(foo bar baz)");
  });

  it("should handle nested lists", function() {
    var str = lisp.stringify(lisp.parse(lisp.tokenize("(foo bar (baz))")).car);
    expect(str).toEqual("(foo bar (baz))");
  });

  it("should handle dotted lists", function() {
    var str = lisp.stringify(lisp.parse(lisp.tokenize("(1 . 2)")).car);
    expect(str).toEqual("(1 . 2)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("(1 . ())")).car);
    expect(str).toEqual("(1)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("(1 2 3 . ())")).car);
    expect(str).toEqual("(1 2 3)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("((1 2 3) . ())")).car);
    expect(str).toEqual("((1 2 3))");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("((1 2 3) . (1 2 3))")).car);
    expect(str).toEqual("((1 2 3) 1 2 3)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("((1 2 3) . (1 2 3 . 4))")).car);
    expect(str).toEqual("((1 2 3) 1 2 3 . 4)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("(1 . (2 . (3 . ())))")).car);
    expect(str).toEqual("(1 2 3)");

    var str = lisp.stringify(lisp.parse(lisp.tokenize("(() () ())")).car);
    expect(str).toEqual("(() () ())");
  });

});

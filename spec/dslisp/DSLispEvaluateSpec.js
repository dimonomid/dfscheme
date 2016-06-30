describe("DSLisp evaluate", function() {
  var DSLisp = require('../../lib/DSLisp.js')
  var lisp;

  beforeEach(function() {
    lisp = new DSLisp();
  });

  it("should hanlde simple expr", function() {
    var str = lisp.exec("()");
    expect(str).toEqual("()");

    var str = lisp.exec("1");
    expect(str).toEqual("1");

    var str = lisp.exec("(+ 1 2)");
    expect(str).toEqual("3");

    var str = lisp.exec("(+ 1 (+ 10 12))");
    expect(str).toEqual("23");

    var str = lisp.exec("(+ 1 (+ 10 'sd))");
    expect(str).toEqual("23");
  });

});

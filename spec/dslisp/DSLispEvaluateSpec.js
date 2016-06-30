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
  });

  it("should hanlde <", function() {
    var str = lisp.exec("(<)");
    expect(str).toEqual("#t");

    var str = lisp.exec("(< -1)");
    expect(str).toEqual("#t");

    var str = lisp.exec("(< 1 2 3)");
    expect(str).toEqual("#t");

    var str = lisp.exec("(< 1 3 2)");
    expect(str).toEqual("#f");
  });

  it("should hanlde quote", function() {
    var str = lisp.exec("'foo");
    expect(str).toEqual("foo");

    var str = lisp.exec("'(1 2 3)");
    expect(str).toEqual("(1 2 3)");

    var str = lisp.exec("'(1 2 foo (a b c))");
    expect(str).toEqual("(1 2 foo (a b c))");
  });

  it("should define variable", function() {
    lisp.exec("(define x 1)");

    var str = lisp.exec("(+ x 10)");
    expect(str).toEqual("11");
  });

  it("should handle lambdas", function() {
    lisp.exec("(define f (lambda () (+ 100 1)))");

    var str = lisp.exec("(f)");
    expect(str).toEqual("101");

    lisp.exec("(define f2 (lambda (a b) (+ a b)))");

    var str = lisp.exec("(f2 40 50)");
    expect(str).toEqual("90");
  });

  it("should throw on ill-formed lambdas", function() {
    // string as formals
    expect(function() {
      lisp.exec("(define f (lambda \"sd\" 1))");
    }).toThrow();

    // number as formals
    expect(function() {
      lisp.exec("(define f (lambda 1 1))");
    }).toThrow();

    // number as one formal
    expect(function() {
      lisp.exec("(define f (lambda (1) 1))");
    }).toThrow();

    // no expressions
    expect(function() {
      lisp.exec("(define f (lambda (x)))");
    }).toThrow();
  });

});

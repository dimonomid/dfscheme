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

  it("should hanlde -", function() {
    var str = lisp.exec("(- 1)");
    expect(str).toEqual("-1");

    var str = lisp.exec("(- 10 1)");
    expect(str).toEqual("9");

    var str = lisp.exec("(- 10 1 3)");
    expect(str).toEqual("6");

    expect(function() {
      var str = lisp.exec("(-)");
    }).toThrow();
  });

  it("should hanlde *", function() {
    var str = lisp.exec("(*)");
    expect(str).toEqual("1");

    var str = lisp.exec("(* 2 3)");
    expect(str).toEqual("6");

    var str = lisp.exec("(* 2 3 10)");
    expect(str).toEqual("60");
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

  it("should hanlde if", function() {
    var str = lisp.exec("(if (< 2 3) 'yes 'no)");
    expect(str).toEqual("yes");

    var str = lisp.exec("(if (< 3 2) 'yes 'no)");
    expect(str).toEqual("no");

    var str = lisp.exec("(if 1 'yes 'no)");
    expect(str).toEqual("yes");

    var str = lisp.exec("(if 0 'yes 'no)");
    expect(str).toEqual("yes");

    var str = lisp.exec("(if () 'yes 'no)");
    expect(str).toEqual("yes");

    var str = lisp.exec("(if #f 'yes 'no)");
    expect(str).toEqual("no");
  });

  it("should calc factorial and perform tail-recursion", function() {
    lisp.exec("(define fact (lambda (n) (fact-iter 1 1 n)))");
    lisp.exec(
      "(define fact-iter (lambda (product counter max-count) " +
      "  (if (< max-count counter) " +
      "      product " +
      "      (fact-iter (* counter product) " +
      "                 (+ counter 1) " +
      "                 max-count))))"
    );

    lisp.resetMaxCsLen();
    var str = lisp.exec("(fact 5)");
    var v1 = lisp.getMaxCsLen();
    expect(str).toEqual("120");

    lisp.resetMaxCsLen()
    var str = lisp.exec("(fact 10)");
    var v2 = lisp.getMaxCsLen();
    expect(str).toEqual("3628800");

    // the max call stack size should be equal in both (fact 5) and (fact 10)
    expect(v1).toEqual(v2);
  });

  it("should handle closures", function() {
    lisp.exec("(define n 100)");
    lisp.exec("(define f (lambda (x) (lambda () (define x (+ x 1)) x)))");
    lisp.exec("(define gen (f 10))");

    var str = lisp.exec("(gen)");
    expect(str).toEqual("11");

    var str = lisp.exec("(gen)");
    expect(str).toEqual("12");

    var str = lisp.exec("(gen)");
    expect(str).toEqual("13");
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

describe("DSLisp parser", function() {
  var DSLisp = require('../../lib/DSLisp.js')
  var lisp;

  beforeEach(function() {
    lisp = new DSLisp();
  });

  it("should parse simple expr", function() {
    var parsed = lisp.parse(lisp.tokenize("(define x 12)"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "define",
        cdr: new DSLisp.Pair({
          car: "x",
          cdr: new DSLisp.Pair({
            car: "12",
          })
        })
      })
    );
  });

  it("should parse quote", function() {
    var parsed = lisp.parse(lisp.tokenize("'(define x 12)"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "quote",
        cdr: new DSLisp.Pair({
          car: new DSLisp.Pair({
            car: "define",
            cdr: new DSLisp.Pair({
              car: "x",
              cdr: new DSLisp.Pair({
                car: "12",
              })
            })
          })
        })
      })
    );

    var parsed = lisp.parse(lisp.tokenize("'foo"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "quote",
        cdr: new DSLisp.Pair({
          car: "foo",
        })
      })

    );
  });

  it("should handle dotted list", function() {
    var parsed = lisp.parse(lisp.tokenize("'(1 . 2)"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "quote",
        cdr: new DSLisp.Pair({
          car: new DSLisp.Pair({
            car: "1",
            cdr: "2",
          })
        })
      })
    );
  });

  it("should handle dotted list", function() {
    var parsed = lisp.parse(lisp.tokenize("'(1 . ())"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "quote",
        cdr: new DSLisp.Pair({
          car: new DSLisp.Pair({
            car: "1",
          })
        })
      })
    );

    var parsed = lisp.parse(lisp.tokenize("(define . (x . (12 . ())))"));
    expect(parsed).toEqual(
      new DSLisp.Pair({
        car: "define",
        cdr: new DSLisp.Pair({
          car: "x",
          cdr: new DSLisp.Pair({
            car: "12",
          })
        })
      })
    );
  });

  /*
  it("should parse simple expr", function() {
    var parsed = lisp.parse(lisp.tokenize("(define x 12)"));
    expect(parsed).toEqual(["define", "x", "12"]);
  });

  it("should handle quotation", function() {
    var parsed = lisp.parse(lisp.tokenize("'(define x 12)"));
    expect(parsed).toEqual(["quote", ["define", "x", "12"]]);
  });

  it("should handle dotted list", function() {
    var parsed = lisp.parse(lisp.tokenize("'(1 . 2)"));
    var tmp = ["1"];
    tmp.sy = "2";
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(1 . ())"));
    var tmp = ["1"];
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(1 2 3 . bar)"));
    var tmp = ["1", "2", "3"];
    tmp.sy = "bar";
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(1 2 3 . ())"));
    var tmp = ["1", "2", "3"];
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'((1 2 3) . foo)"));
    var tmp = [["1", "2", "3"]];
    tmp.sy = "foo";
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'((1 2 3) . ())"));
    var tmp = [["1", "2", "3"]];
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(1 . (2 . (3 . ())))"));
    var tmp = ["1", "2", "3"];
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(1 . (2 . (3 . 4)))"));
    var tmp = ["1", "2", "3"];
    tmp.sy = "4";
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'((1 2 3) . (1 2 3))"));
    var tmp = [["1", "2", "3"], "1", "2", "3"];
    expect(parsed).toEqual(["quote", tmp]);

    var parsed = lisp.parse(lisp.tokenize("'(() () ())"));
    var tmp = [undefined, undefined, undefined];
    expect(parsed).toEqual(["quote", tmp]);
  });

  it("should throw at ill-formed dotted list", function() {
    expect(
      function() {
        var parsed = lisp.parse(lisp.tokenize("'(1 . 2 3)"));
      }
    ).toThrow(new Error("Ill-formed dotted list"));

    expect(
      function() {
        var parsed = lisp.parse(lisp.tokenize("'(1 . 2 ())"));
      }
    ).toThrow(new Error("Ill-formed dotted list"));
  });
  */

});

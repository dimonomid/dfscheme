'use strict';

function DFScheme(opts) {

  var pIdx = 0;
  var gScop = {};
  opts = opts || {};

  // call stack; each item is an object with the following possible keys:
  // - func: function which is executed at this stack level; may be undefined
  // - tail: if set to true, then the call being executed at the moment is the
  //   tail call, so, it's safe to unwind this frame for tail-call optimization
  var cs = [];

  // max len of `cs` array; needed for tests to ensure the tail call
  // optimization works
  var maxCsLen = 0;

  var wrap = {};
  wrap["'"] = "quote";
  wrap["`"] = "quasiquote";
  wrap[","] = "unquote";

  function getMaxCsLen() {
    return maxCsLen;
  }

  function resetMaxCsLen() {
    maxCsLen = 0;
  }

  function eq(a, b) {
    return a === b;
  }

  function equal(a, b) {
    if (a === b) {
      return true;
    } else {
      if (isPair(a) && isPair(b)) {
        return equal(a.car, b.car) && equal(a.cdr, b.cdr);
      } else {
        return false;
      }
    }
  }

  function assoc(pred, obj, alist) {
    while (isPair(alist)) {
      if (!isPair(alist.car)) {
        throw new Error("Wrong argument given to assoc");
      }
      if (pred(alist.car.car, obj)) {
        return alist.car;
      }
      alist = alist.cdr;
    }

    return mkBool(false);
  }

  function filter(boolv, func, list) {
    var tmp, cur = mkNull(), ret = mkNull();

    while (isPair(list)) {
      if (boolValue(call(func, [list.car])) === boolv) {
        tmp = new Pair(list.car);
        if (isNull(cur)) {
          cur = tmp;
          ret = cur;
        } else {
          cur.cdr = tmp;
          cur = cur.cdr;
        }
      }
      list = list.cdr;
    }

    return ret;
  }

  function wrongArg(fname, arg) {
    throw new Error("Argument of wrong type was given to " + fname + ": " + stringify(arg));
  }

  function car(pair) {
    if (!isPair(pair)) {
      wrongArg("car", pair);
    }
    return pair.car;
  }

  function cdr(pair) {
    if (!isPair(pair)) {
      wrongArg("cdr", pair);
    }
    return pair.cdr;
  }

  setToScope(gScop, "car", car);
  setToScope(gScop, "cdr", cdr);

  setToScope(gScop, "caar", function(pair) {
    if (!isPair(pair)) {
      wrongArg("caar", pair);
    }
    return car(pair.car);
  });

  setToScope(gScop, "cadr", function(pair) {
    if (!isPair(pair)) {
      wrongArg("cadr", pair);
    }
    return car(pair.cdr);
  });

  setToScope(gScop, "cdar", function(pair) {
    if (!isPair(pair)) {
      wrongArg("cdar", pair);
    }
    return cdr(pair.car);
  });

  setToScope(gScop, "cddr", function(pair) {
    if (!isPair(pair)) {
      wrongArg("cddr", pair);
    }
    return cdr(pair.cdr);
  });

  setToScope(gScop, "+", function() {
    var i, ret = 0, val;
    var args = arguments;
    for (i = 0; i < args.length; i++) {
      val = numberValue(args[i]);
      if (typeof val !== "number") {
        throw new Error("Argument of wrong type was given to '+': " + stringify(args[i]));
      }
      ret += val;
    }

    return mkNumber(ret);
  });

  setToScope(gScop, "*", function() {
    var i, ret = 1, val;
    var args = arguments;
    for (i = 0; i < args.length; i++) {
      val = numberValue(args[i]);
      if (typeof val !== "number") {
        throw new Error("Argument of wrong type was given to '*': " + stringify(args[i]));
      }
      ret *= val;
    }

    return mkNumber(ret);
  });

  setToScope(gScop, "-", function() {
    var i, ret = 0, first, val;
    var args = arguments;

    if (args.length >= 1) {
      first = numberValue(args[0]);
      if (typeof first !== "number") {
        throw new Error("Argument of wrong type was given to '-': " + stringify(args[0]));
      }

      if (args.length === 1) {
        ret = -first;
      } else {
        ret = first;
        for (i = 1; i < args.length; i++) {
          val = numberValue(args[i]);
          if (typeof val !== "number") {
            throw new Error("Argument of wrong type was given to '<': " + stringify(args[i]));
          }
          ret -= val;
        }
      }
    } else {
      throw new Error("'-' requires at least 1 argument, 0 given");
    }

    return mkNumber(ret);
  });

  setToScope(gScop, "<", function() {
    var i, ret = true, val;
    // TODO: vix Number.NEGATIVE_INFINITY in v7 and use it here
    var pval = -999999999999999999999999999;
    var args = arguments;

    for (i = 0; ret && i < args.length; i++) {
      val = numberValue(args[i]);
      if (typeof val !== "number") {
        throw new Error("Argument of wrong type was given to '<': " + stringify(args[i]));
      }
      ret = pval < val;
      pval = val;
    }

    return mkBool(ret);
  });

  setToScope(gScop, "length", function(list) {
    var ret = 0;

    while (!isNull(list)) {
      ret++;
      list = list.cdr;
    }

    return mkNumber(ret);
  });

  setToScope(gScop, "map", function() {
    var i, args;
    var a = arguments, done = false, ret = mkNull(), cret = mkNull(), tmp;

    while (true) {
      // build arguments array for the next lambda invocation
      args = [];
      for (i = 1; i < a.length; i++) {
        if (isNull(a[i])) {
          done = true;
          break;
        }

        if (!isPair(a[i])) {
          throw new Error("Expression given to map is not a list");
        }
        args.push(a[i].car);
        a[i] = a[i].cdr;
      }

      // if we reached the end of any source list, stop
      if (done) {
        break;
      }

      // invoke lambda
      tmp = new Pair(call(a[0], args));

      // store thr result
      if (isNull(cret)) {
        cret = tmp;
        ret = cret;
      } else {
        cret.cdr = tmp;
        cret = cret.cdr;
      }
    }

    return ret;
  });

  setToScope(gScop, "apply", function(func, argsl) {
    // create array with all evaluated arguments
    var args = [];
    while (isPair(argsl)) {
      args.push(argsl.car);
      argsl = argsl.cdr;
    }

    // get function value from scope and call it with the arguments
    curCSItem().tail = true;
    return call(func, args);
  });

  setToScope(gScop, "append", function() {
    var cur = mkNull(), ret = mkNull();
    var a = arguments;
    var i;

    if (a.length > 0) {
      // all but last arguments will be copied
      for (i = 0; i < a.length - 1; i++) {
        while (isPair(a[i])) {
          if (isNull(cur)) {
            cur = new Pair(a[i].car);
            ret = cur;
          } else {
            cur.cdr = new Pair(a[i].car);
            cur = cur.cdr;
          }
          a[i] = a[i].cdr;
        }
      }

      // the last argument will be used as it is, without creating a copy
      if (isNull(cur)) {
        cur = a[a.length - 1]
        ret = cur;
      } else {
        cur.cdr = a[a.length - 1];
        cur = cur.cdr;
      }
    }

    return ret;
  });

  setToScope(gScop, "filter", function(func, list) {
    return filter(true, func, list);
  });

  setToScope(gScop, "remove", function(func, list) {
    return filter(false, func, list);
  });

  setToScope(gScop, "odd?", function(a) {
    var n = numberValue(a);
    if (n === undefined) {
      throw new Error("Wrong argument type for odd?")
    }
    return mkBool(!!(n & 1));
  });

  setToScope(gScop, "even?", function(a) {
    var n = numberValue(a);
    if (n === undefined) {
      throw new Error("Wrong argument type for even?")
    }
    return mkBool(!(n & 1));
  });

  setToScope(gScop, "eq?", function(a, b) {
    return mkBool(a === b);
  });

  setToScope(gScop, "eqv?", function(a, b) {
    return mkBool(a === b);
  });

  setToScope(gScop, "equal?", function(a, b) {
    return mkBool(equal(a, b))
  });

  setToScope(gScop, "assq", function(obj, alist) {
    return assoc(eq, obj, alist);
  });

  setToScope(gScop, "assv", function(obj, alist) {
    return assoc(eq, obj, alist);
  });

  setToScope(gScop, "assoc", function(obj, alist) {
    return assoc(equal, obj, alist);
  });

  function augmentScope(scope) {
    var F = function() {};
    F.prototype = scope;
    var f = new F();
    return f;
  }

  function tokenize(str) {
    // TODO: handle escaped characters in string literals
    var ret = str.match(/\"[^"]*\"|\(|\)|\'|\`|\,|[^'()\t\r\n ]+/g);
    return ret;
  }

  function parsePart(tokens) {
    var ret, cexpr, arg, tmp, wsDot = false;

    if (tokens[pIdx] == '(') {
      pIdx++;
      if (tokens[pIdx] == ')') {
        // an empty list: it's null
        pIdx++;
        ret = undefined;
      } else {
        // non-empty list
        ret = new Pair();
        cexpr = undefined;
        while ((pIdx < tokens.length) && tokens[pIdx] != ')') {
          if (wsDot) {
            // we already have the second part of the S-expression, so, no more items
            // are allowed
            throw new Error("Ill-formed dotted list");
          }
          if (tokens[pIdx] == ".") {
            wsDot = true;
            // we have a dotted list; let's parse the second part of S-expression
            pIdx++;
            tmp = parsePart(tokens);

            if (!isNull(tmp)) {
              if (cexpr === undefined) {
                ret.cdr = tmp;
              } else {
                cexpr.cdr = tmp;
              }
            }
          } else {
            // regular list item; push it to our array
            if (cexpr === undefined) {
              ret.car = parsePart(tokens);
              cexpr = ret;
            } else {
              cexpr.cdr = new Pair();
              cexpr.cdr.car = parsePart(tokens);
              cexpr = cexpr.cdr;
            }
          }
        }
        if (tokens[pIdx] != ")") {
          throw new Error("Missing ')'");
        } else {
          pIdx++;
        }
      }
    } else if (tokens[pIdx] in wrap) {
      // quoted, quasiquoted, or unquoted data (see `wrap` object)
      ret = new Pair(wrap[tokens[pIdx]]);

      pIdx++;
      arg = parsePart(tokens);

      ret.cdr = new Pair(arg);
    } else {
      // atom
      ret = tokens[pIdx++];
    }

    return ret;
  }

  function parse(tokens) {
    pIdx = 0;
    var ret = mkNull(), cur;
    while (pIdx < tokens.length) {
      if (isNull(cur)) {
        ret = new Pair();
        cur = ret;
      } else {
        cur = cur.cdr = new Pair();
      }
      cur.car = parsePart(tokens);
    }
    return ret;
  }

  function getFromScope(scope, symbol) {
    var ret;

    if (symbol in scope) {
      //ret = evalInScope(scope[symbol], scope);
      ret = scope[symbol];
    } else {
      throw new Error("Unbound variable: " + JSON.stringify(symbol));
    }

    return ret;
  }

  function setToScope(scope, symbol, value) {
    var cur = scope;

    while (cur) {
      if (cur.hasOwnProperty(symbol)) {
        cur[symbol] = value;
        break;
      } else {
        cur = Object.getPrototypeOf(cur);
      }
    }

    if (!cur) {
      //TODO: is that right?
      scope[symbol] = value;
    }
  }

  function checkArgsCnt(expr, needCnt) {
    var len = calcListLen(expr);
    if (len != needCnt) {
      throw new Error("Ill-formed special form " + expr.car + ": expect " + needCnt + " arguments, " + len + " given");
    }
  }

  function calcListLen(expr) {
    var ret = 0;

    if (expr.car) {
      ret = 1;
      while (expr.cdr) {
        expr = expr.cdr;
        ret++;
      }
    }

    return ret;
  }

  /**
   * quasiquote
   */
  function qq(expr, scope) {
    var ret;
    if (isPair(expr)) {
      if (expr.car === "unquote") {
        ret = evalInScope(expr.cdr.car, scope);
      } else {
        ret = new Pair(
          qq(expr.car, scope),
          qq(expr.cdr, scope)
        );
      }
    } else {
      ret = expr;
    }

    return ret;
  }

  function mkListFromArr(arr) {
    var ret = mkNull(), cur = mkNull();
    var tmp, i;
    for (i = 0; i < arr.length; i++) {
      tmp = new Pair(arr[i]);
      if (isNull(cur)) {
        cur = tmp;
        ret = cur;
      } else {
        cur.cdr = tmp;
        cur = cur.cdr;
      }
    }
    return ret;
  }

  function evalInScope(expr, scope) {
    var ret, i, rootExpr, val;

    if (opts.cbEval) {
      opts.cbEval(expr, scope);
    }

    rootExpr = expr;

    // push an empty object to call stack (will be filled with some data lazily)
    cs.push({});

    if (cs.length > maxCsLen) {
      maxCsLen = cs.length;
    }

    if (isNull(expr) || isJSFunc(expr) || isLambda(expr)) {
      ret = expr;
    } else if (stringValue(expr) !== undefined){
      ret = expr;
    } else if (numberValue(expr) !== undefined){
      ret = expr;
    } else if (boolValue(expr) !== undefined){
      ret = expr;
    } else if (isSSNB(expr)){
      // symbol. We don't use symbolValue() in order to save a bit of work
      ret = getFromScope(scope, expr);
    } else if (isPair(expr)) {

      // TODO: probably remove this check
      if (calcListLen(expr) < 1) {
        throw new Error("Internal: pair length is 0");
      }

      if (expr.car === "quote") {
        checkArgsCnt(expr, 2);

        ret = expr.cdr.car;

      } else if (expr.car === "quasiquote") {
        checkArgsCnt(expr, 2);

        ret = qq(expr.cdr.car, scope);
      } else if (expr.car === "if") {
        if (calcListLen(expr) != 3 && calcListLen(expr) != 4) {
          throw new Error("Ill-formed special form " + expr.car);
        }

        expr = expr.cdr;

        val = boolValue(evalInScope(expr.car, scope));
        if (val !== false) {
          expr = expr.cdr;
          curCSItem().tail = true;
          ret = evalInScope(expr.car, scope);
        } else {
          expr = expr.cdr.cdr;
          if (!isNull(expr)) {
            curCSItem().tail = true;
            ret = evalInScope(expr.car, scope);
          } else {
            // there's no "alternative" expression given, setting to null
            // (TODO: introduce some "no-value" value? we can use `null` for that)
            ret = mkNull();
          }
        }

      } else if (expr.car === "define") {
        expr = expr.cdr;

        if (isPair(expr.car)) {
          // lambda syntax sugar
          if (!symbolValue(expr.car.car)) {
            throw new Error("Ill-formed special form define: expect a symbol as the first argument");
          }
          setToScope(scope, expr.car.car, mkLambda(expr.car.cdr, expr.cdr, scope));
          ret = expr.car.car;

        } else {
          // regular variable binding
          if (!symbolValue(expr.car)) {
            throw new Error("Ill-formed special form define: expect a symbol as the first argument");
          }
          setToScope(scope, expr.car, evalInScope(expr.cdr.car, scope));
          ret = expr.car;
        }
      } else if (expr.car === "lambda") {

        ret = mkLambda(expr.cdr.car, expr.cdr.cdr, scope);

        // TODO: handle all the rest of special forms:
        // http://www.gnu.org/software/mit-scheme/documentation/mit-scheme-ref/Special-Forms.html
      } else {
        // function call

        // create array with all evaluated arguments
        expr = expr.cdr;
        var args = [];
        while (!isNull(expr)) {
          args.push(evalInScope(expr.car, scope));
          expr = expr.cdr;
        }

        // get function value from scope and call it with the arguments
        ret = _call(
          getFromScope(scope, rootExpr.car),
          args
        );
      }
    }

    // pop the frame from the call stack array
    cs.pop();

    return ret;
  }

  function call(f, args) {
    cs.push({});
    var ret = _call(f, args);
    cs.pop();
    return ret;
  }

  function _call(f, args) {
    var ret, i;

    // remember current call frame index; we'll need that if we need to
    // re-evaluate the function due to tail-call optimization
    var csidx = cs.length - 1;

    // store the function the current call stack frame
    curCSItem().func = f;

    // check if we can perform tail-call optimization. If yes, the call
    // below will throw a special object with the `csidx` property, which
    // evalInScope catches and interprets
    optimizeTailCall(f, args);

    // this flag will be set to true if we need to repeat the function
    // call evaluation (when tail-call optimization takes place)
    var rpt;

    do {
      rpt = false;

      try {
        if (isJSFunc(f)) {
          // JS function

          ret = f.apply(augmentScope(gScop), args);
        } else if (isLambda(f)) {
          // Lisp function

          var newScope = augmentScope(f.scope);

          // populate all evaluated arguments into the new scope
          if (isNull(f.args) || isPair(f.args)) {
            // function takes exact number of formal arguments, so,
            // populate each of them
            var aname = f.args;
            i = 0;
            while (isPair(aname)) {
              setToScope(newScope, aname.car, args[i]);
              i++;
              aname = aname.cdr;
            }

            if (i != args.length) {
              throw new Error(
                "Wrong number of args for the procedure" // + rootExpr.car
              )
            }
          } else {
            // function takes arbitrary number of arguments, so, populate
            // one list variable
            // (f.args must be a symbol)
            setToScope(newScope, f.args, mkListFromArr(args));
          }

          // evaluate each expression in the function
          var fexpr = f.exprs;
          while (!isNull(fexpr)) {
            if (isNull(fexpr.cdr)) {
              // we're going to evaluate the last expression of the function,
              // so, set the `tail` flag
              curCSItem().tail = true;
            }

            ret = evalInScope(fexpr.car, newScope);

            fexpr = fexpr.cdr;
          }
        } else {
          throw new Error("not applicable: " + f);
          //TODO: error: not applicable
        }
      } catch (e) {
        if ('csidx' in e) {
          // some call is being tail-optimized. Let's check if `csidx` is
          // equal to the one of the current call frame

          if (e.csidx != csidx) {
            // no, it's not the `csidx` in question, so, rethrow further
            throw e;
          } else {
            // yes, we need to repeat the function call evaluation! Let's
            // setup data and evaluate it again

            // set new args for the function
            args = e.args;

            // reset call stack size
            // TODO: use `cs.length = csidx + 1` once it works normally in
            // v7
            while (cs.length > csidx + 1) {
              cs.pop();
            }

            // clear the `tail` flag
            curCSItem().tail = false;

            // setting the flag `rpt` to true will cause us to repeat
            // the function call evaluation
            rpt = true;
          }
        } else {
          // some regular error, just rethrow
          throw e;
        }
      }
    } while (rpt);

    delete curCSItem().func;

    return ret;
  }

  function evaluate(expr) {
    return evalInScope(expr, gScop);
  }

  function evaluateEach(expr) {
    var ret = mkNull();
    while (!isNull(expr)) {
      ret = evalInScope(expr.car, gScop);
      expr = expr.cdr;
    }
    return ret;
  }

  function exec(str) {
    if (opts.cbExec) {
      opts.cbExec(str);
    }

    try {
      var ret = stringify(evaluateEach(parse(tokenize(str))));
    } finally {
      if (opts.cbExecDone) {
        opts.cbExecDone(str);
      }
    }

    return ret;
  }

  function stringify(expr) {
    var ret = "", i = 0;

    if (isNull(expr)) {
      ret = "()";
    } else if (isPair(expr)) {
      // a list
      ret = "(";
      while (isPair(expr)) {
        if (i > 0) {
          ret += " ";
        }
        ret += stringify(expr.car);

        expr = expr.cdr;
        i++;
      }

      if (!isNull(expr)) {
        ret += " . " + expr;
      }

      ret += ")";
    } else if (isSSNB(expr)) {
      ret = expr;
    } else if (isJSFunc(expr)) {
      ret = "JS function: " + expr.toString();
    } else if (isLambda(expr)) {
      ret = "lambda";
    } else {
      throw new Error("Internal: unknown value type: " + JSON.stringify(expr));
    }

    return ret;
  }

  function isLambda(expr) {
    return (Lambd.prototype.isPrototypeOf(expr));
  }

  function isPair(expr) {
    return (Pair.prototype.isPrototypeOf(expr));
  }

  function isNull(expr) {
    return (expr === undefined);
  }

  function isJSFunc(expr) {
    return (typeof expr === "function");
  }

  /**
   * Returns whether the given expression is either a symbol, a string or a number
   */
  function isSSNB(expr) {
    return typeof expr === "string";
  }

  function boolValue(expr) {
    var ret = undefined;

    if (expr === "#t") {
      ret = true;
    } else if (expr === "#f") {
      ret = false;
    }

    return ret;
  }

  function symbolValue(expr) {
    var ret = undefined;

    if (isSSNB(expr)) {
      if (boolValue(expr) === undefined
          && stringValue(expr) === undefined
          && numberValue(expr) === undefined
         )
      {
        ret = expr;
      }
    }

    return ret;
  }

  /**
   * If the given expr represents a string, returns the string value; otherwise
   * returns undefined. This function therefore can be used to check whether
   * the given expression is a string
   */
  function stringValue(expr) {
    var ret;

    if (isSSNB(expr)) {
      if (expr[0] == '"' && expr[expr.length - 1] == '"') {
        // TODO: handle escaped chars
        ret = expr.slice(1, expr.length - 1);
      }
    }

    return ret;
  }

  /**
   * If the given expr represents a number, returns the number value; otherwise
   * returns undefined. This function therefore can be used to check whether
   * the given expression is a number
   */
  function numberValue(expr) {
    var ret;

    if (isSSNB(expr)) {
      ret = Number(expr);
      if (isNaN(ret)) {
        ret = undefined;
      }
    }

    return ret;
  }

  function mkNumber(number) {
    return String(number);
  }

  function mkBool(bool) {
    return bool ? "#t" : "#f";
  }

  function mkNull(bool) {
    return undefined;
  }

  function mkLambda(args, exprs, scope) {
    // check that the arg list is a list or a symbol
    if (!isNull(args) && !isPair(args) && !symbolValue(args)) {
      throw new Error("Ill-formed special form lambda");
    }

    // check that all formals are symbols
    if (isPair(args)) {
      var alist = args;
      do {
        if (!symbolValue(alist.car)) {
          throw new Error("Ill-formed special form lambda: all formals should be symbols, " + stringify(alist.car) + " given");
        }
        alist = alist.cdr;
      } while (!isNull(alist))
    }

    // check that number of expressions is > 0
    if (isNull(exprs)) {
      throw new Error("Ill-formed special form lambda: number of expressions must be 1 or more");
    }

    return new Lambd(args, exprs, scope);
  }

  function curCSItem() {
    if (cs.length <= 0) {
      throw new Error("Internal: curCSItem() when cs is empty");
    }
    return cs[cs.length - 1];
  }

  /**
   * Check if we can perform tail-call optimization. If yes, the function
   * throws a special object with the `csidx` property, which is caught
   * in `_call()`
   */
  function optimizeTailCall(func, args) {
    var i;
    // check all stack frames except the last one
    // (since the last one is the one which we'll probably eliminate)
    for (i = cs.length - 1 - 1; i >= 0; i--) {
      if (!cs[i].tail) {
        break;
      }

      if (cs[i].func === func) {
        // found the tail call with the function equal to the one which is
        // going to be called! Let's optimize out this call
        throw {
          csidx: i,
          args: args,
        };
      }
    }
  }

  /**
   * Check if we can perform tail-call optimization.
   */
  function checkTailCall(func) {
    var i;
    // check all stack frames except the last one
    // (since the last one is the one which we'll probably eliminate)
    for (i = cs.length - 1 - 1; i >= 0; i--) {
      if (!cs[i].tail) {
        break;
      }

      if (cs[i].func === func) {
        // found the tail call with the function equal to the one which is
        // going to be called! Let's optimize out this call
        return i;
      }
    }

    return -1;
  }

  function Pair(car, cdr) {
    if (car) {
      this.car = car;
    }
    if (cdr) {
      this.cdr = cdr;
    }
  }

  function Lambd(args, exprs, scope) {
    if (args) {
      this.args = args;
    }
    this.exprs = exprs;
    this.scope = scope;
  }

  Pair.prototype.car = mkNull();
  Pair.prototype.cdr = mkNull();

  DFScheme.prototype.tokenize = tokenize;
  DFScheme.prototype.parse = parse;
  DFScheme.prototype.evaluate = evaluate;
  DFScheme.prototype.evaluateEach = evaluateEach;
  DFScheme.prototype.stringify = stringify;
  DFScheme.prototype.exec = exec;

  DFScheme.prototype.isPair = isPair;
  DFScheme.prototype.isNull = isNull;
  DFScheme.prototype.symbolValue = symbolValue;
  DFScheme.prototype.stringValue = stringValue;
  DFScheme.prototype.numberValue = numberValue;

  DFScheme.prototype.getMaxCsLen = getMaxCsLen;
  DFScheme.prototype.resetMaxCsLen = resetMaxCsLen;

  DFScheme.Pair = Pair;
}

if (typeof module === 'object') {
  module.exports = DFScheme;
};

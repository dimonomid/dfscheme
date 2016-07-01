'use strict';

function DSLisp() {

  var pIdx = 0;
  var gScop = {};

  // call stack; each item is an object with the following possible keys:
  // - func: function which is executed at this stack level; may be undefined
  // - tail: if set to true, then the call being executed at the moment is the
  //   tail call, so, it's safe to unwind this frame for tail-call optimization
  var cs = [];

  // max len of `cs` array; needed for tests to ensure the tail call
  // optimization works
  var maxCsLen = 0;

  function getMaxCsLen() {
    return maxCsLen;
  }

  function resetMaxCsLen() {
    maxCsLen = 0;
  }

  gScop["+"] = function() {
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
  }

  gScop["*"] = function() {
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
  }

  gScop["-"] = function() {
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
  }

  gScop["<"] = function() {
    var i, ret = true, val, pval = Number.NEGATIVE_INFINITY;
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
  }

  gScop.quote = function() {

  }

  function augmentScope(scope) {
    var F = function() {};
    F.prototype = scope;
    return new F();
  }

  function tokenize(str) {
    var ret = str.match(/\(|\)|\'|[^'()\t\r\n ]+/g);
    return ret;
  }

  function parsePart(tokens) {
    var ret, arg, tmp, wsDot = false;

    if (tokens[pIdx] == '(') {
      pIdx++;
      if (tokens[pIdx] == ')') {
        // an empty list: it's null
        pIdx++;
        ret = undefined;
      } else {
        // non-empty list
        ret = [];
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
            if (isPair(tmp)) {
              // the second part of S-expression is a list: just cons it to the existing list
              ret = ret.concat(tmp);
              if (tmp.sy) {
                ret.sy = tmp.sy;
              }
            } else if (tmp !== undefined) {
              // the second part of S-expression is not a list: set it in a special way,
              // by assigning the `sy` property
              ret.sy = tmp;
            }
          } else {
            // regular list item; push it to our array
            ret.push(parsePart(tokens));
          }
        }
        if (tokens[pIdx] != ")") {
          throw new Error("Missing ')'");
        } else {
          pIdx++;
        }
      }
    } else if (tokens[pIdx] == "'") {
      // quoted data
      pIdx++;
      arg = parsePart(tokens);
      ret = ["quote", arg];
    } else {
      // atom
      ret = tokens[pIdx++];
    }

    return ret;
  }

  function parse(tokens) {
    pIdx = 0;
    return parsePart(tokens);
  }

  function getFromScope(scope, symbol) {
    var ret;

    if (symbol in scope) {
      ret = evalInScope(scope[symbol], scope);
    } else {
      throw new Error("Unbound variable: " + symbol);
    }

    return ret;
  }

  function checkArgsCnt(expr, needCnt) {
    if (expr.length != needCnt) {
      throw new Error("Ill-formed special form " + expr[0] + ": expect " + needCnt + " arguments, " + expr.length + " given");
    }
  }

  function evalInScope(expr, scope) {
    var ret, i, f;

    // push an empty object to call stack (will be filled with some data lazily)
    cs.push({});

    var csidx = cs.length - 1;
    if (cs.length > maxCsLen) {
      maxCsLen = cs.length;
    }

    if (isNull(expr) || isJSFunc(expr)) {
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
      if (expr.length < 1) {
        throw new Error("Internal: pair length is 0");
      }

      if (expr[0] === "quote") {
        checkArgsCnt(expr, 2);

        ret = expr[1];

      } else if (expr[0] === "if") {
        if (expr.length != 3 && expr.length != 4) {
          throw new Error("Ill-formed special form " + expr[0]);
        }

        var val = boolValue(evalInScope(expr[1], scope));
        if (val !== false) {
          // evaluating "consequent" expression
          curCSItem().tail = true;
          ret = evalInScope(expr[2], scope);
        } else if (expr.length === 4) {
          // evaluating "alternative" expression
          curCSItem().tail = true;
          ret = evalInScope(expr[3], scope);
        } else {
          // there's no "alternative" expression given, setting to null
          // (TODO: introduce some "no-value" value? we can use `null` for that)
          ret = mkNull();
        }

      } else if (expr[0] === "define") {
        checkArgsCnt(expr, 3);

        if (isPair(expr[1])) {
          //TODO: lambda syntax sugar
        } else {
          // regular variable binding
          if (!symbolValue(expr[1])) {
            throw new Error("Ill-formed special form " + expr[0] + ": expect a symbol as the first argument");
          }
          scope[expr[1]] = evalInScope(expr[2]);
        }
      } else if (expr[0] === "lambda") {
        // check that the arg list is indeed a list
        if (!isNull(expr[1]) && !isPair(expr[1])) {
          throw new Error("Ill-formed special form " + expr[0] + ": second item should be a list, " + stringify(expr[1]) + " given");
        }

        // check that all formals are symbols
        if (isPair(expr[1])) {
          for (i = 0; i < expr[1].length; i++) {
            if (!symbolValue(expr[1][i])) {
              throw new Error("Ill-formed special form " + expr[0] + ": all formals should be symbols, " + stringify(expr[1][i]) + " given");
            }
          }
        }

        // check that number of expressions is > 0
        if (expr.length < 3) {
          throw new Error("Ill-formed special form " + expr[0] + ": number of expressions must be 1 or more");
        }

        ret = expr;

        // TODO: handle all the rest of special forms:
        // http://www.gnu.org/software/mit-scheme/documentation/mit-scheme-ref/Special-Forms.html
      } else {
        // function call

        // create array with all evaluated arguments
        var args = [];
        for (i = 1; i < expr.length; i++) {
          args.push(evalInScope(expr[i], scope));
        }

        // get function value from scope
        f = getFromScope(scope, expr[0]);

        // store it in the current call stack frame
        curCSItem().func = f;

        // check if we can perform tail-call optimization. If yes, the call
        // below will throw a special object with the `csidx` property
        optimizeTailCall(f, args);

        // this flag will be set to true if we need to repeat the function
        // call evaluation (because of the tail-call optimization)
        var rpt;

        do {
          rpt = false;

          try {
            if (isJSFunc(f)) {
              // JS function

              ret = f.apply(augmentScope(scope), args);
            } else if (isLambda(f)) {
              // Lisp function

              var newScope = augmentScope(scope);
              var needArgsCnt = isPair(f[1]) ? f[1].length : 0;

              if (needArgsCnt != expr.length - 1) {
                throw new Error(
                  "The procedure " + expr[0]
                    + " has been called with " + (expr.length - 1) + " arguments;"
                    + " it requires exactly " + needArgsCnt + " arguments."
                )
              }

              // populate all evaluated arguments into the new scope
              for (i = 0; i < needArgsCnt; i++) {
                newScope[ f[1][i] ] = args[i];
              }

              // evaluate each expression in the function
              for (i = 2; i < f.length; i++) {
                if (i === f.length - 1) {
                  // we're going to evaluate the last expression of the function,
                  // so, set the `tail` flag
                  curCSItem().tail = true;
                }

                ret = evalInScope(f[i], newScope);
              }

              // clear newScope var so that the object can be garbage-collected
              newScope = undefined;
            } else {
              //TODO: error: not applicable
            }
          } catch (e) {
            if ('csidx' in e) {
              // some call is being tail-optimized. Let's check if `csidx` is
              // equal to the one of the current stack frame

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
      }
    }

    // pop the frame from the call stack array
    cs.pop();

    return ret;
  }

  function evaluate(expr) {
    return evalInScope(expr, gScop);
  }

  function exec(str) {
    return stringify(evaluate(parse(tokenize(str))));
  }

  function stringify(expr) {
    var ret = "", i;

    if (isNull(expr)) {
      ret = "()";
    } else if (isPair(expr)) {
      // a list
      ret = "(";
      for (i = 0; i < expr.length; i++) {
        if (i > 0) {
          ret += " ";
        }
        ret += stringify(expr[i]);
      }
      if (expr.sy) {
        ret += " . " + expr.sy;
      }
      ret += ")";
    } else if (isSSNB(expr)) {
      ret = expr;
    } else if (isJSFunc(expr)) {
      ret = "JS function: " + expr.toString();
    } else {
      throw new Error("Internal: unknown value type: " + JSON.stringify(expr));
    }

    return ret;
  }

  function isLambda(expr) {
    return isPair(expr) && expr[0] === "lambda";
  }

  function isPair(expr) {
    return (typeof expr === "object" && "length" in expr);
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

  function curCSItem() {
    if (cs.length <= 0) {
      throw new Error("Internal: curCSItem() when cs is empty");
    }
    return cs[cs.length - 1];
  }

  /**
   * Check if we can perform tail-call optimization. If yes, the function
   * throws a special object with the `csidx` property, which is caught
   * in `evalInScope()`
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

  DSLisp.prototype.tokenize = tokenize;
  DSLisp.prototype.parse = parse;
  DSLisp.prototype.evaluate = evaluate;
  DSLisp.prototype.stringify = stringify;
  DSLisp.prototype.exec = exec;

  DSLisp.prototype.isPair = isPair;
  DSLisp.prototype.isNull = isNull;
  DSLisp.prototype.symbolValue = symbolValue;
  DSLisp.prototype.stringValue = stringValue;
  DSLisp.prototype.numberValue = numberValue;

  DSLisp.prototype.getMaxCsLen = getMaxCsLen;
  DSLisp.prototype.resetMaxCsLen = resetMaxCsLen;
}

if ('module' in global) {
  module.exports = DSLisp;
};

'use strict';

function JSLisp() {

  var pIdx = 0;
  var gScop = {};

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
          ret = evalInScope(expr[2], scope);
        } else if (expr.length === 4) {
          // evaluating "alternative" expression
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

        // get and evaluate function
        f = getFromScope(scope, expr[0]);

        if (isJSFunc(f)) {
          // JS function

          // create array with all evaluated arguments
          var args = [];
          for (i = 1; i < expr.length; i++) {
            args.push(evalInScope(expr[i], scope));
          }

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

          for (i = 0; i < needArgsCnt; i++) {
            newScope[ f[1][i] ] = evalInScope(expr[i + 1], scope);
          }

          for (i = 2; i < f.length; i++) {
            ret = evalInScope(f[i], newScope);
          }

          // clear newScope var so that the object can be garbage-collected
          newScope = undefined;
        } else {
          //TODO: error: not applicable
        }
      }
    }

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

  JSLisp.prototype.tokenize = tokenize;
  JSLisp.prototype.parse = parse;
  JSLisp.prototype.evaluate = evaluate;
  JSLisp.prototype.stringify = stringify;
  JSLisp.prototype.exec = exec;

  JSLisp.prototype.isPair = isPair;
  JSLisp.prototype.isNull = isNull;
  JSLisp.prototype.symbolValue = symbolValue;
  JSLisp.prototype.stringValue = stringValue;
  JSLisp.prototype.numberValue = numberValue;
}

if (module) {
  module.exports = JSLisp;
};

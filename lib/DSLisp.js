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

  function evalInScope(expr, scope) {
    var ret, tmp, i, f, args;

    if (isNull(expr) || isJSFunc(expr)) {
      ret = expr;
    } else if (tmp = stringValue(expr)){
      ret = expr;//tmp;
    } else if (tmp = numberValue(expr)){
      ret = expr;//tmp;
    } else if (isSSN(expr)){
      // symbol. We don't use symbolValue() in order to save a bit of work
      ret = getFromScope(scope, expr);
    } else if (isPair(expr)) {

      // TODO: probably remove this check
      if (expr.length < 1) {
        throw new Error("Internal: pair length is 0");
      }

      if (expr[0] === "quote") {
        if (expr.length != 2) {
          throw new Error("Ill-formed special form: quote");
        }

        ret = expr[1];

        // TODO: handle all the rest of special forms:
        // http://www.gnu.org/software/mit-scheme/documentation/mit-scheme-ref/Special-Forms.html
      } else {
        // function call

        // evaluate all arguments
        args = [];
        for (i = 1; i < expr.length; i++) {
          args.push(evalInScope(expr[i], scope));
        }

        // get and evaluate function
        f = getFromScope(scope, expr[0]);

        if (isJSFunc(f)) {
          ret = f.apply(augmentScope(scope), args);
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
    } else if (isSSN(expr)) {
      ret = expr;
    } else if (isJSFunc(expr)) {
      ret = "JS function: " + expr.toString();
    } else {
      throw new Error("Internal: unknown value type: " + JSON.stringify(expr));
    }

    return ret;
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
  function isSSN(expr) {
    return typeof expr === "string";
  }

  function symbolValue(expr) {
    var ret = undefined;

    if (isSSN(expr)) {
      if (stringValue(expr) === undefined && numberValue(expr) === undefined) {
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

    if (isSSN(expr)) {
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

    if (isSSN(expr)) {
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

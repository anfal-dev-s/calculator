/*
   Scientific calculator engine.
   Handles tokenizing, parsing, calculation, errors and number formatting.
*/

const Engine = (() => {
    class CalcError extends Error {
        get kind() {
            return "Error";
        }

        toString() {
            return `${this.kind}: ${this.message}`;
        }
    }

    class SyntaxErr extends CalcError {
        get kind() {
            return "Syntax error";
        }
    }

    class MathErr extends CalcError {
        get kind() {
            return "Math error";
        }
    }

    const SYMBOLS = {
        "×": "*",
        "÷": "/",
        "−": "-",
        "√": "sqrt",
        "π": "pi",
        "²": "^2",
        "sin⁻¹": "asin",
        "cos⁻¹": "acos",
        "tan⁻¹": "atan"
    };

    const SHOWN = {
        sqrt: "√",
        nthroot: "ⁿ√",
        logbase: "logₐ",
        asin: "sin⁻¹",
        acos: "cos⁻¹",
        atan: "tan⁻¹"
    };

    const TOKEN =
        /(?<num>(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?)|(?<name>[A-Za-z]+)|(?<op>[-+*/^(),!])|(?<space>\s+)|(?<bad>.)/gu;

    function tokenize(text) {
        for (const [symbol, plain] of Object.entries(SYMBOLS)) {
            text = text.replaceAll(symbol, plain);
        }

        const tokens = [];

        for (const match of text.matchAll(TOKEN)) {
            const kind = Object.keys(match.groups).find(
                key => match.groups[key] !== undefined
            );

            const value = match[0];

            if (kind === "space") {
                continue;
            }

            if (kind === "bad") {
                throw new SyntaxErr(`cannot read '${value}'`);
            }

            tokens.push([kind, value]);
        }

        return tokens;
    }

    const mod = (x, m) => ((x % m) + m) % m;

    const toRadians = (x, angle) =>
        angle === "DEG" ? x * Math.PI / 180 : x;

    const fromRadians = (x, angle) =>
        angle === "DEG" ? x * 180 / Math.PI : x;

    function sin_(x, angle) {
        if (angle === "DEG" && mod(x, 90) === 0) {
            return [0, 1, 0, -1][Math.floor(mod(x, 360) / 90)];
        }

        return Math.sin(toRadians(x, angle));
    }

    function cos_(x, angle) {
        if (angle === "DEG" && mod(x, 90) === 0) {
            return [1, 0, -1, 0][Math.floor(mod(x, 360) / 90)];
        }

        return Math.cos(toRadians(x, angle));
    }

    function tan_(x, angle) {
        if (angle === "DEG") {
            if (mod(x - 90, 180) === 0) {
                throw new MathErr(`tan(${x}°) is undefined`);
            }

            if (mod(x, 180) === 0) {
                return 0;
            }
        } else {
            const poleIndex = Math.round((x - Math.PI / 2) / Math.PI);
            const pole = Math.PI / 2 + poleIndex * Math.PI;
            const tolerance =
                Number.EPSILON * Math.max(1, Math.abs(x)) * 4;

            if (Math.abs(x - pole) <= tolerance) {
                throw new MathErr(`tan(${x}) is undefined`);
            }
        }

        return Math.tan(toRadians(x, angle));
    }

    function asin_(x, angle) {
        if (x < -1 || x > 1) {
            throw new MathErr("asin requires a number between -1 and 1");
        }

        return fromRadians(Math.asin(x), angle);
    }

    function acos_(x, angle) {
        if (x < -1 || x > 1) {
            throw new MathErr("acos requires a number between -1 and 1");
        }

        return fromRadians(Math.acos(x), angle);
    }

    function atan_(x, angle) {
        return fromRadians(Math.atan(x), angle);
    }

    function ln_(x) {
        if (x <= 0) {
            throw new MathErr("ln requires a number greater than zero");
        }

        return Math.log(x);
    }

    function log_(x) {
        if (x <= 0) {
            throw new MathErr("log requires a number greater than zero");
        }

        return Math.log10(x);
    }

    function logbase_(base, value) {
        if (base <= 0 || base === 1) {
            throw new MathErr("logarithm base must be positive and not equal to one");
        }

        if (value <= 0) {
            throw new MathErr("logarithm requires a number greater than zero");
        }

        return Math.log(value) / Math.log(base);
    }

    function sqrt_(x) {
        if (x < 0) {
            throw new MathErr("square root requires a non-negative number");
        }

        return Math.sqrt(x);
    }

    function nthroot_(index, value) {
        if (!Number.isInteger(index) || index < 1) {
            throw new MathErr("root index must be a positive whole number");
        }

        if (value < 0 && index % 2 === 0) {
            throw new MathErr("an even root requires a non-negative number");
        }

        if (value < 0) {
            return -Math.pow(-value, 1 / index);
        }

        return Math.pow(value, 1 / index);
    }

    function factorial(x) {
        if (!Number.isInteger(x) || x < 0 || x > 170) {
            throw new MathErr(
                "factorial requires a whole number from 0 to 170"
            );
        }

        let result = 1;

        for (let i = 2; i <= x; i++) {
            result *= i;
        }

        return result;
    }

    function raiseTo(base, exponent) {
        if (base === 0 && exponent < 0) {
            throw new MathErr("zero cannot be raised to a negative power");
        }

        if (base < 0 && !Number.isInteger(exponent)) {
            throw new MathErr(
                "a negative number cannot be raised to a fractional power"
            );
        }

        return Math.pow(base, exponent);
    }

    const FUNCTIONS = {
        sin: sin_,
        cos: cos_,
        tan: tan_,
        asin: asin_,
        acos: acos_,
        atan: atan_,
        ln: ln_,
        log: log_,
        sqrt: sqrt_,
        nthroot: nthroot_,
        abs: x => Math.abs(x)
    };

    const CONSTANTS = {
        pi: Math.PI,
        e: Math.E
    };

    const EMPTY = {
        Ans: "no answer yet, press = first",
        M: "memory is empty"
    };

    class Parser {
        constructor(tokens, angle, variables, functions) {
            this.tokens = tokens;
            this.i = 0;
            this.angle = angle;
            this.variables = variables;
            this.functions = functions;
        }

        peek() {
            return this.i < this.tokens.length
                ? this.tokens[this.i][1]
                : null;
        }

        take() {
            if (this.i >= this.tokens.length) {
                throw new SyntaxErr("the expression ends too early");
            }

            return this.tokens[this.i++];
        }

        expect(text) {
            if (this.peek() !== text) {
                throw new SyntaxErr(`missing '${text}'`);
            }

            this.take();
        }

        expr() {
            let value = this.term();

            while (this.peek() === "+" || this.peek() === "-") {
                const op = this.take()[1];
                const right = this.term();

                value = op === "+"
                    ? value + right
                    : value - right;
            }

            return value;
        }

        term() {
            let value = this.unary();

            while (this.peek() === "*" || this.peek() === "/") {
                const op = this.take()[1];
                const right = this.unary();

                if (op === "/") {
                    if (right === 0) {
                        throw new MathErr("cannot divide by zero");
                    }

                    value /= right;
                } else {
                    value *= right;
                }
            }

            return value;
        }

        unary() {
            if (this.peek() === "-") {
                this.take();
                return -this.unary();
            }

            if (this.peek() === "+") {
                this.take();
                return this.unary();
            }

            return this.power();
        }

        power() {
            const base = this.postfix();

            if (this.peek() === "^") {
                this.take();

                const exponent = this.unary();

                return raiseTo(base, exponent);
            }

            return base;
        }

        postfix() {
            let value = this.primary();

            while (this.peek() === "!") {
                this.take();
                value = factorial(value);
            }

            return value;
        }

        primary() {
            const [kind, value] = this.take();

            if (kind === "num") {
                return Number(value);
            }

            if (kind === "op" && value === "(") {
                const result = this.expr();
                this.expect(")");
                return result;
            }

            if (kind !== "name") {
                throw new SyntaxErr(`unexpected '${value}'`);
            }

            if (this.peek() === "(") {
                this.take();

                if (this.peek() === ")") {
                    throw new SyntaxErr(`${value} requires an argument`);
                }

                const argument = this.expr();

                if (value === "nthroot" || value === "logbase") {
                    this.expect(",");
                    const secondArgument = this.expr();
                    this.expect(")");
                    return value === "nthroot"
                        ? nthroot_(argument, secondArgument)
                        : logbase_(argument, secondArgument);
                }

                this.expect(")");

                return this.call(value, argument);
            }

            return this.lookup(value);
        }

        lookup(name) {
            if (Object.hasOwn(this.variables, name)) {
                const value = this.variables[name];

                if (value === null || value === undefined) {
                    throw new CalcError(
                        EMPTY[name] ?? `${name} has no value yet`
                    );
                }

                return value;
            }

            if (Object.hasOwn(CONSTANTS, name)) {
                return CONSTANTS[name];
            }

            if (
                Object.hasOwn(FUNCTIONS, name) ||
                name === "logbase" ||
                Object.hasOwn(this.functions, name)
            ) {
                const shown = SHOWN[name] ?? name;

                throw new SyntaxErr(
                    `${shown} needs brackets, like ${shown}(2)`
                );
            }

            throw new SyntaxErr(`unknown name '${name}'`);
        }

        call(name, x) {
            if (Object.hasOwn(this.functions, name)) {
                const [parameter, body] = this.functions[name];

                return evaluate(
                    body,
                    this.angle,
                    { [parameter]: x },
                    this.functions
                );
            }

            if (Object.hasOwn(FUNCTIONS, name)) {
                return FUNCTIONS[name](x, this.angle);
            }

            throw new SyntaxErr(`unknown function '${name}'`);
        }
    }

    function evaluate(
        text,
        angle = "DEG",
        variables = {},
        functions = {}
    ) {
        const tokens = tokenize(text);

        if (tokens.length === 0) {
            throw new SyntaxErr("nothing to calculate");
        }

        const parser = new Parser(
            tokens,
            angle,
            variables ?? {},
            functions ?? {}
        );

        let value;

        try {
            value = parser.expr();
        } catch (error) {
            if (error instanceof RangeError) {
                throw new MathErr(
                    "a function that calls itself never stops"
                );
            }

            throw error;
        }

        const left = parser.peek();

        if (left === ")") {
            throw new SyntaxErr("')' without a matching '('");
        }

        if (left !== null) {
            throw new SyntaxErr(`missing operator before '${left}'`);
        }

        if (!Number.isFinite(value)) {
            throw new MathErr("result too large");
        }

        return value;
    }

    function check(body, parameter, functions = {}) {
        try {
            evaluate(body, "RAD", { [parameter]: 1 }, functions);
        } catch (error) {
            if (error instanceof SyntaxErr || !(error instanceof CalcError)) {
                throw error;
            }
        }
    }

    function trimDecimal(text) {
        if (!text.includes(".")) {
            return text;
        }

        return text.replace(/0+$/, "").replace(/\.$/, "");
    }

    function formatNumber(x) {
        if (!Number.isFinite(x)) {
            throw new MathErr("result too large");
        }

        if (x === 0 || Object.is(x, -0)) {
            return "0";
        }

        const exponential = x.toExponential(11);
        const exponent = Number(exponential.split("e")[1]);

        if (exponent < -4 || exponent >= 12) {
            const [mantissa, exp] = exponential.split("e");

            return `${trimDecimal(mantissa)}E${Number(exp)}`;
        }

        return trimDecimal(x.toFixed(11 - exponent));
    }

    return {
        evaluate,
        check,
        formatNumber,
        tokenize,
        CalcError,
        SyntaxErr,
        MathErr,
        FUNCTIONS,
        CONSTANTS
    };
})();
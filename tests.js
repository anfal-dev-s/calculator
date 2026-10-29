
/* Tests for the Model: engine.js and model.js. Open tests.html in a browser.

   Each case is written as the user would type it on the keys, and checked
   against what the display must show, so a passing test means a correct screen. */

const results = [];

function check(name, test) {
    try {
        test();
        results.push([name, null]);
    } catch (error) {
        results.push([name, error.message || String(error)]);
    }
}

function equal(actual, expected) {
    if (actual !== expected) {
        throw new Error(
            `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    }
}

function closeTo(actual, expected, tolerance = 1e-10) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`expected ${expected}, got ${actual}`);
    }
}

function throws(action, type) {
    try {
        action();
    } catch (error) {
        if (error instanceof type) return;
        throw new Error(`threw "${error}" instead of a ${type.name}`);
    }

    throw new Error(`no ${type.name} was thrown`);
}

const shown = (text, angle = "DEG", variables = {}, functions = {}) =>
    Engine.formatNumber(
        Engine.evaluate(text, angle, variables, functions)
    );

const createModel = () => new CalculatorModel(null);

function displays(group, cases, angle = "DEG") {
    for (const [text, expected] of Object.entries(cases)) {
        check(
            `${group}: ${text} shows ${expected}${angle === "RAD" ? " in RAD" : ""}`,
            () => equal(shown(text, angle), expected)
        );
    }
}

// --- The engine -------------------------------------------------------------

displays("precedence", {
    "2+3×4": "14",
    "(2+3)×4": "20",
    "10−4−3": "3",
    "100÷10÷5": "2",
    "2^3^2": "512",
    "-2^2": "-4",
    "2^-1": "0.5",
    "--3": "3",
    "3!": "6",
    "-3!": "-6",
    "2×3!": "12",
    "(1+2)×(3+4)": "21"
});

displays("functions", {
    "sin(30)": "0.5",
    "cos(60)": "0.5",
    "tan(45)": "1",
    "sin(180)": "0",
    "cos(90)": "0",
    "sin(-90)": "-1",
    "sin(450)": "1",
    "sin⁻¹(0.5)": "30",
    "acos(0)": "90",
    "atan(1)": "45",
    "log(1000)": "3",
    "logbase(2,8)": "3",
    "logbase(10,100)": "2",
    "logbase(1+1,8)": "3",
    "logbase(2,logbase(2,16))": "2",
    "ln(e)": "1",
    "abs(-3)": "3",
    "nthroot(3,8)": "2",
    "nthroot(2,9)": "3",
    "nthroot(3,-8)": "-2",
    "nthroot(3,nthroot(2,64))": "2",
    "√(16)": "4",
    "√(2)": "1.41421356237",
    "3²": "9",
    "5!": "120",
    "0!": "1",
    "e^0": "1"
});

displays("functions", {
    "sin(π÷2)": "1",
    "cos(π)": "-1",
    "sin(30)": "-0.988031624093"
}, "RAD");

check("unit conversion: selected categories and temperature scales", () => {
    closeTo(UnitConverter.convert(2, "length", "km", "m"), 2000);
    closeTo(UnitConverter.convert(500, "mass", "g", "kg"), 0.5);
    closeTo(UnitConverter.convert(32, "temperature", "f", "c"), 0);
    closeTo(UnitConverter.convert(100, "temperature", "c", "f"), 212);
    closeTo(UnitConverter.convert(1, "volume", "l", "ml"), 1000);
    closeTo(UnitConverter.convert(1, "area", "ha", "m2"), 10000);
    closeTo(UnitConverter.convert(36, "speed", "kph", "mps"), 10);
    closeTo(UnitConverter.convert(2, "time", "h", "min"), 120);
    equal(Object.keys(CONVERSION_CATEGORIES).length, 7);
    throws(
        () => UnitConverter.convert(1, "distance", "m", "km"),
        RangeError
    );
});

displays("numbers", {
    "0.1+0.2": "0.3",
    "1÷3": "0.333333333333",
    "6.02E23×2": "1.204E24",
    "1E-7": "1E-7",
    "1.5E3+1": "1501",
    "2^40": "1.09951162778E12",
    "123456789012": "123456789012",
    ".5+.5": "1",
    "-0": "0"
});

for (const text of [
    "1÷0",
    "log(-1)",
    "ln(0)",
    "√(-4)",
    "tan(90)",
    "tan(-270)",
    "sin⁻¹(2)",
    "nthroot(2,-4)",
    "nthroot(0,8)",
    "logbase(1,10)",
    "logbase(-2,8)",
    "logbase(2,0)",
    "3.5!",
    "(-1)!",
    "171!",
    "(-8)^(1/3)",
    "0^-1",
    "10^400",
    "1E200×1E200"
]) {
    check(
        `math error: ${text}`,
        () => throws(
            () => Engine.evaluate(text, "DEG"),
            Engine.MathErr
        )
    );
}

for (const text of [
    "(2+3",
    "2+3)",
    "2+",
    "2 3",
    "2(3)",
    "sin 30",
    "sin30",
    "×2",
    "2E",
    "E5",
    "#",
    "",
    "sin()"
]) {
    check(
        `syntax error: "${text}"`,
        () => throws(
            () => Engine.evaluate(text, "DEG"),
            Engine.SyntaxErr
        )
    );
}

check("errors name the problem", () => {
    const message = text => {
        try {
            Engine.evaluate(text, "DEG");
        } catch (error) {
            return String(error);
        }
    };

    equal(
        message("1÷0"),
        "Math error: cannot divide by zero"
    );

    equal(
        message("(2+3"),
        "Syntax error: missing ')'"
    );

    equal(
        message("tan(90)"),
        "Math error: tan(90°) is undefined"
    );

    equal(
        message("sin30"),
        "Syntax error: sin needs brackets, like sin(2)"
    );
});

// --- The Model: what the screen shows after key presses ---------------------

function press(model, ...keys) {
    for (const key of keys) {
        if (key === "=") {
            model.calculate();
        } else if (key === "DEL") {
            model.deleteLast();
        } else if (key === "AC") {
            model.clear();
        } else if (key === "M+") {
            model.memoryAdd(1);
        } else if (key === "DEG/RAD") {
            model.toggleAngle();
        } else {
            model.insert(key);
        }
    }

    return model;
}

check("model: a calculation", () => {
    const m = press(
        createModel(),
        "sin(", "3", "0", ")", "+", "2", "^", "3", "="
    );

    equal(m.expression, "sin(30)+2^3");
    equal(m.result, "8.5");
});

check("model: live result preview does not commit the calculation", () => {
    const m = press(createModel(), "2", "+", "3");

    equal(m.previewResult(), "5");
    equal(m.result, "0");
    equal(m.ans, null);
    equal(m.history.length, 0);

    m.calculate();

    equal(m.previewResult(), null);
    equal(m.result, "5");
    equal(m.ans, 5);
    equal(m.history.length, 1);
});

check("model: live preview closes open parentheses for evaluation", () => {
    const m = press(createModel(), "sin(", "3");

    equal(m.previewResult(), shown("sin(3)"));
    equal(m.expression, "sin(3");
    equal(m.result, "0");

    m.clear();
    press(m, "(", "(", "2", "+", "3");

    equal(m.previewResult(), "5");
    equal(m.expression, "((2+3");
});

check("model: backspace skips the implicit close before evaluating", () => {
    const m = press(createModel(), "sin(", "3");
    const expectedValue = Engine.evaluate("sin(3)");

    m.deleteLast();
    equal(m.expression, "sin(3");

    m.calculate();

    equal(m.isError, false);
    equal(m.result, Engine.formatNumber(expectedValue));
    equal(m.ans, expectedValue);
});

check("model: incomplete and invalid expressions have no live preview", () => {
    const m = press(createModel(), "2", "+");

    equal(m.previewResult(), null);

    m.clear();
    press(m, "sin(", "3", "+");
    equal(m.previewResult(), null);

    m.clear();
    press(m, "1", "÷", "0");

    equal(m.previewResult(), null);
    equal(m.isError, false);
});

check("history: successful calculations are stored once", () => {
    const m = createModel();
    press(m, "2", "+", "3", "=");
    m.calculate();

    equal(m.history.length, 1);
    equal(m.history[0].expression, "2+3");
    equal(m.history[0].result, "5");
    equal(m.history[0].angle, "DEG");
});

check("history: incomplete and failed calculations are not stored", () => {
    const m = createModel();
    press(m, "2", "+", "=");
    equal(m.history.length, 0);

    m.clear();
    press(m, "1", "÷", "0", "=");
    equal(m.history.length, 0);
});

check("history: entries persist, restore, reuse, and clear", () => {
    const store = {
        value: null,
        getItem() {
            return this.value;
        },
        setItem(key, value) {
            this.value = value;
        }
    };
    const m = new CalculatorModel(store);
    m.setAngle("RAD");
    press(m, "π", "=", "1", "+", "2", "=");

    const restored = new CalculatorModel(store);
    equal(restored.history.length, 2);
    equal(restored.history[0].expression, "1+2");
    equal(restored.history[1].expression, "π");
    equal(restored.reuseHistoryEntry(restored.history[1]), true);
    equal(restored.angle, "RAD");
    equal(restored.expression, "π");
    restored.clearHistory();

    equal(new CalculatorModel(store).history.length, 0);
});

check("history: keeps only the latest eight calculations", () => {
    const store = {
        value: null,
        getItem() {
            return this.value;
        },
        setItem(key, value) {
            this.value = value;
        }
    };
    const m = new CalculatorModel(store);

    for (let value = 1; value <= 10; value += 1) {
        press(m, String(value), "=");
    }

    equal(m.history.length, 8);
    equal(m.history[0].expression, "10");
    equal(m.history[7].expression, "3");

    const storedEntries = JSON.parse(store.value);
    equal(storedEntries.length, 8);
    equal(new CalculatorModel(store).history[0].expression, "10");
});

check("history: trims saved entries to the latest eight", () => {
    const store = {
        value: JSON.stringify(
            Array.from({ length: 10 }, (_, index) => ({
                expression: String(index + 1),
                result: String(index + 1),
                angle: "DEG",
                timestamp: index + 1
            }))
        ),
        getItem() {
            return this.value;
        },
        setItem(key, value) {
            this.value = value;
        }
    };
    const m = new CalculatorModel(store);

    equal(m.history.length, 8);
    equal(m.history[0].expression, "10");
    equal(m.history[7].expression, "3");
});

check("display formatting: calculator symbols render as mathematical notation", () => {
    const target = document.createElement("span");
    const render = (expression) => {
        CalculatorView.prototype.renderExpression.call(
            { expression: target },
            expression
        );
        return target;
    };

    equal(render("sqrt(9)").textContent, "√(9)");
    equal(render("asin(0.5)").textContent, "sin⁻¹(0.5)");
    equal(render("abs(-3)").textContent, "| − 3|");
    equal(render("logbase(2,8)").textContent, "log2(8)");
    equal(render("logbase(2,8)").querySelector("sub").textContent, "2");
    equal(render("nthroot(3,8)").textContent, "3√(8)");
    equal(render("nthroot(3,8)").querySelector("sup").textContent, "3");
    equal(render("pi*2").textContent, "π × 2");
});

check("display formatting: SCI shows decimal results in scientific notation", () => {
    const renderResult = (value, scientificNotation) => {
        const result = document.createElement("span");
        const view = {
            scientificNotation,
            functionButton: { setAttribute() {} },
            deleteFunctionButton: {},
            keys: {
                querySelector: () => ({ classList: { toggle() {} } })
            },
            renderExpression() {},
            expression: document.createElement("span"),
            result,
            status: { setAttribute() {} },
            memoryIndicator: {},
            buttons: []
        };
        const model = {
            functions: {},
            expression: "",
            previewResult: () => null,
            justEvaluated: true,
            isError: false,
            result: value,
            angle: "RAD",
            memory: null
        };

        CalculatorView.prototype.render.call(view, model);
        return result;
    };

    const positive = renderResult("1234", true);
    equal(positive.textContent, "1.234 × 103");
    equal(positive.querySelector("sup").textContent, "3");
    equal(renderResult("0.00001", true).textContent, "1 × 10-5");
    equal(renderResult("1234", false).textContent, "1,234");
});

check("model: an operator after = continues from Ans", () => {
    const m = press(
        createModel(),
        "2", "+", "3", "=", "+", "1"
    );

    equal(m.expression, "Ans+1");
    equal(m.result, "");

    press(m, "=");

    equal(m.result, "6");
});

check("model: a digit after = starts afresh and clears the old answer", () => {
    const m = press(
        createModel(),
        "2", "+", "3", "=", "7"
    );

    equal(m.expression, "7");
    equal(m.result, "");
});

check("model: DEL removes a whole key press", () => {
    const m = press(
        createModel(),
        "tan(", "DEL", "cos(", "9", "0", ")", "="
    );

    equal(m.expression, "cos(90)");
    equal(m.result, "0");
});

check("model: an error is shown and the expression stays to be fixed", () => {
    const m = press(
        createModel(),
        "1", "÷", "0", "="
    );

    equal(m.isError, true);
    equal(m.result, "Math error: cannot divide by zero");

    press(m, "DEL", "2", "=");

    equal(m.isError, false);
    equal(m.result, "0.5");
});

check("model: memory", () => {
    const m = press(
        createModel(),
        "4", "M+", "AC", "M", "×", "3", "="
    );

    equal(m.memory, 4);
    equal(m.result, "12");

    m.memoryClear();

    press(m, "AC", "M", "=");

    equal(m.result, "Error: memory is empty");
});

check("model: MC, MR, M+, M−, and MS", () => {
    const m = createModel();

    m.insert("8");
    m.calculate();
    equal(m.memoryStore(), 8);

    m.clear();
    m.insert("3");
    m.calculate();
    equal(m.memoryAdd(1), 11);
    equal(m.memoryAdd(-1), 8);

    m.clear();
    equal(m.memoryRecall(), 8);
    equal(m.expression, "(8)");

    m.memoryClear();
    equal(m.memory, null);
    equal(m.memoryRecall(), null);
    equal(m.result, "Error: memory is empty");
});

check("model: DEG/RAD", () => {
    const m = press(
        createModel(),
        "DEG/RAD", "sin(", "π", "÷", "2", ")", "="
    );

    equal(m.angle, "RAD");
    equal(m.result, "1");
});

check("model: select DEG or RAD without clearing the expression", () => {
    const m = createModel();

    m.insert("sin(");
    m.insert("π");
    m.insert("÷");
    m.insert("2");
    m.insert(")");
    m.setAngle("RAD");

    equal(m.angle, "RAD");
    equal(m.expression, "sin(π÷2)");
    m.calculate();
    equal(m.result, "1");

    m.setAngle("DEG");
    equal(m.angle, "DEG");
    equal(m.expression, "sin(π÷2)");
});

check("model: the View is told of every change", () => {
    const m = createModel();
    let calls = 0;

    m.onChange(() => calls++);

    press(m, "1", "+", "1", "=");

    equal(calls, 4);
});

// --- Part 2 ---------------------------------------------------------------

check("programmable: functions call each other", () => {
    const functions = {
        f: ["x", "x^2+1"],
        g: ["t", "2×f(t)"]
    };

    equal(shown("f(3)", "DEG", {}, functions), "10");
    equal(shown("g(3)", "DEG", {}, functions), "20");
});

check("programmable: a function that calls itself is stopped", () => {
    throws(
        () => Engine.evaluate(
            "f(1)",
            "DEG",
            {},
            { f: ["x", "f(x)+1"] }
        ),
        Engine.MathErr
    );
});

check("programmable: a definition with a mistake is refused", () => {
    throws(
        () => Engine.check("x^2+", "x"),
        Engine.SyntaxErr
    );

    Engine.check("ln(x-1)", "x");
});

check("programmable: the Model uses stored functions", () => {
    const m = createModel();

    m.functions.f = ["x", "x^2+1"];

    press(m, "f(", "3", ")", "=");

    equal(m.result, "10");
});

check("programmable: delete a stored function", () => {
    const m = createModel();

    m.functions.f = ["x", "x^2+1"];
    m.insert("f(");
    m.insert("3");
    m.insert(")");

    equal(m.deleteFunction("f"), true);
    equal(Object.hasOwn(m.functions, "f"), false);
    equal(m.expression, "");
    equal(m.result, "Deleted f");
    equal(m.deleteFunction("f"), false);
});

check("graphing: the formula is read with x", () => {
    equal(shown("x^2", "RAD", { x: 3 }), "9");
    equal(shown("sin(π÷2)", "RAD"), "1");
    equal(shown("sin(90)", "DEG"), "1");

    throws(
        () => Engine.evaluate("1÷x", "RAD", { x: 0 }),
        Engine.MathErr
    );

    throws(
        () => Engine.evaluate("tan(π÷2)", "RAD"),
        Engine.MathErr
    );
    throws(
        () => Engine.evaluate("tan(3×π÷2)", "RAD"),
        Engine.MathErr
    );
    equal(shown("tan(π÷4)", "RAD"), "1");
});

// --- Show the results ------------------------------------------------------

const failed = results.filter(([, error]) => error);

const summary = document.querySelector("#summary");

summary.textContent = failed.length === 0
    ? `OK: all ${results.length} checks pass`
    : `${failed.length} of ${results.length} checks fail`;

summary.className = failed.length === 0 ? "ok" : "fail";

document.querySelector("#results").replaceChildren(
    ...[
        ...failed,
        ...results.filter(([, error]) => !error)
    ].map(([name, error]) => {
        const item = document.createElement("li");

        item.className = error ? "fail" : "ok";

        item.textContent = error
            ? `FAIL  ${name}: ${error}`
            : `ok    ${name}`;

        return item;
    })
);

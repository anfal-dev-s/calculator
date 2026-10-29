
/* التحكم في ضغطات الأزرار */

window.calculatorExtensions = window.calculatorExtensions || [];

window.extend = function (extension) {
    if (!extension || typeof extension.install !== "function") {
        throw new Error("Invalid calculator extension");
    }

    window.calculatorExtensions.push(extension);
};

class CalculatorController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.commands = new Map();
        this.shiftMode = false;
        this.pendingNthRoot = false;
        this.pendingLogBase = false;

        this.view.onPress((key, text) => {
            this.handleKey(key, text);
        });

        this.view.onDisplayAction(() => {
            this.handleKey("DEL");
        });

        this.view.onAngleToggle(() => {
            this.model.toggleAngle();
        });

        this.view.onFunctionArgumentClick(() => {
            this.selectFunctionArgument();
        });

        this.model.onChange(() => {
            this.view.render(this.model);
        });

        document.addEventListener("keydown", (event) => {
            this.onKey(event);
        });

        this.view.render(this.model);
    }

    addCommand(label, action) {
        this.commands.set(label, action);
    }

    onKey(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (this.view.root.querySelector(".display").inert) {
            return;
        }

        const target = event.target;

        if (
            target instanceof HTMLElement &&
            target.closest(
                "input, textarea, select, [contenteditable='true']"
            )
        ) {
            return;
        }

        if (
            (event.key === "Enter" || event.key === " ") &&
            target instanceof HTMLButtonElement
        ) {
            return;
        }

        let key = event.key;

        if (key === "Enter" || key === "=") {
            key = "=";
        } else if (key === "Backspace") {
            key = "DEL";
        } else if (key === "Escape") {
            key = "AC";
        } else if (key === "*") {
            key = "×";
        } else if (key === "/") {
            key = "÷";
        } else if (key === "-") {
            key = "−";
        } else if (!/^[0-9a-zA-Z.+^()!%]$/.test(key)) {
            return;
        }

        event.preventDefault();

        this.handleKey(key);
        this.view.flash(key);
    }

    toggleSign() {
        const expression = this.model.expression;

        if (!expression || /[+\-*/^(]$/.test(expression)) {
            this.model.insert("-");
            return;
        }

        this.model.insert("*(-1)");
    }

    applyPercent() {
        const expression = this.model.expression;

        if (!expression || !/[0-9.)]$/.test(expression)) {
            return;
        }

        this.model.insert("/100");
    }

    selectFunctionArgument() {
        if (this.pendingNthRoot) {
            const rootStart = this.model.expression.lastIndexOf("nthroot(");
            if (rootStart === -1) {
                return;
            }

            const index = this.model.expression.slice(rootStart + 8);
            if (!index.trim() || index.includes(",") || index.includes(")")) {
                return;
            }

            this.pendingNthRoot = false;
            this.model.insert(",");
            return;
        }

        if (this.pendingLogBase) {
            const logStart = this.model.expression.lastIndexOf("logbase(");
            if (logStart === -1) {
                return;
            }

            const baseStart = logStart + "logbase(".length;
            const base = this.model.expression.slice(baseStart);
            let depth = 0;
            let baseIsComplete = true;

            for (const character of base) {
                if (character === "(") {
                    depth += 1;
                } else if (character === ")") {
                    if (depth === 0) {
                        baseIsComplete = false;
                        break;
                    }
                    depth -= 1;
                } else if (character === "," && depth === 0) {
                    baseIsComplete = false;
                    break;
                }
            }

            if (!base.trim() || !baseIsComplete) {
                return;
            }

            this.pendingLogBase = false;
            this.model.insert(",");
        }
    }

    handleKey(key, text = null) {
        if (this.commands.has(key)) {
            this.commands.get(key)();
            return;
        }

        if (key === "x" && this.shiftMode) {
            this.model.insert("abs(");
            return;
        }

        if (typeof text === "string") {
            this.model.insert(text);
            return;
        }

        switch (key) {
            case "SCI":
                this.view.setScientificMode(!this.view.scientificMode);
                break;

            case "SCI-NOTATION":
                this.view.toggleScientificNotation();
                this.view.render(this.model);
                break;

            case "BASIC":
                this.view.setScientificMode(false);
                break;

            case "AC":
                this.pendingNthRoot = false;
                this.pendingLogBase = false;
                this.model.clear();
                break;

            case "f(x)":
                this.model.insert(
                    Object.hasOwn(this.model.functions, "f")
                        ? "f("
                        : "f(x)="
                );
                break;

            case "DEL_F":
                this.model.deleteFunction("f");
                break;

            case "DEL":
                this.model.deleteLast();
                break;

            case "=":
                this.pendingNthRoot = false;
                this.pendingLogBase = false;
                this.model.calculate();
                break;

            case "MC":
                this.model.memoryClear();
                break;

            case "MR":
                this.model.memoryRecall();
                break;

            case "M+":
                this.model.memoryAdd(1);
                break;

            case "M−":
                this.model.memoryAdd(-1);
                break;

            case "MS":
                this.model.memoryStore();
                break;

            case "RAD/DEG":
                this.model.toggleAngle();
                break;

            case "()": {
                const expression = this.model.expression;
                const openCount = (expression.match(/\(/g) || []).length;
                const closeCount = (expression.match(/\)/g) || []).length;
                const endsWithValue = /[0-9.)!]$/.test(expression);

                if (openCount > closeCount && endsWithValue) {
                    this.model.insert(")");
                } else if (endsWithValue) {
                    this.model.insert("*(");
                } else {
                    this.model.insert("(");
                }
                break;
            }

            case "SHIFT":
                this.shiftMode = !this.shiftMode;
                this.view.setShiftMode(this.shiftMode);
                break;

            case "±":
                this.toggleSign();
                break;

            case "%":
                this.applyPercent();
                break;

            case "√":
                if (this.shiftMode) {
                    this.pendingNthRoot = true;
                    this.model.insert("nthroot(");
                } else {
                    this.model.insert("sqrt(");
                }
                break;

            case "x²":
                this.model.insert("^2");
                break;

            case "xʸ":
                this.model.insert("^");
                break;

            case "×":
                this.model.insert("*");
                break;

            case "÷":
                this.model.insert("/");
                break;

            case "−":
                this.model.insert("-");
                break;

            case "π":
                this.model.insert("pi");
                break;

            case "e":
                this.model.insert("e");
                break;

            case "sin":
                this.model.insert(
                    this.shiftMode ? "asin(" : "sin("
                );
                break;

            case "cos":
                this.model.insert(
                    this.shiftMode ? "acos(" : "cos("
                );
                break;

            case "tan":
                this.model.insert(
                    this.shiftMode ? "atan(" : "tan("
                );
                break;

            case "log":
                if (this.shiftMode) {
                    this.pendingLogBase = true;
                    this.model.insert("logbase(");
                } else {
                    this.model.insert("log(");
                }
                break;

            case "ln":
                this.model.insert(key + "(");
                break;

            case "1/x":
                this.model.insert("1/(");
                break;

            default:
                this.model.insert(key);
                break;
        }
    }
}

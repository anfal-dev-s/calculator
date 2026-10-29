
/* حفظ حالة الآلة الحاسبة والذاكرة */

const CONTINUES = ["+", "-", "−", "*", "×", "/", "÷", "^", "!"];
const MAX_HISTORY_ENTRIES = 8;

class CalculatorModel {
    constructor(historyStorage = undefined) {
        this.pieces = [];
        this.angle = "DEG";
        this.ans = null;
        this.memory = null;
        this.functions = {};
        this.result = "0";
        this.expression = "";
        this.deletedImplicitClosures = 0;
        this.status = "";
        this.isError = false;
        this.justEvaluated = false;
        this.listeners = [];
        this.historyStorage =
            historyStorage === undefined
                ? this.getHistoryStorage()
                : historyStorage;
        this.history = this.loadHistory();
    }

    getHistoryStorage() {
        try {
            return window.localStorage;
        } catch (error) {
            console.error("Calculator history storage is unavailable.", error);
            return null;
        }
    }

    loadHistory() {
        if (!this.historyStorage) {
            return [];
        }

        let serialized;

        try {
            serialized = this.historyStorage.getItem("calculator.history.v1");
        } catch (error) {
            console.error("Unable to read calculator history.", error);
            return [];
        }

        if (serialized === null) {
            return [];
        }

        let entries;

        try {
            entries = JSON.parse(serialized);
        } catch (error) {
            console.error("Calculator history contains invalid JSON.", error);
            return [];
        }

        if (!Array.isArray(entries)) {
            console.error("Calculator history must be a list.");
            return [];
        }

        const validEntries = entries.filter((entry) =>
            entry &&
            typeof entry.expression === "string" &&
            typeof entry.result === "string" &&
            (entry.angle === "DEG" || entry.angle === "RAD") &&
            Number.isFinite(entry.timestamp) &&
            Number.isFinite(new Date(entry.timestamp).getTime())
        );

        if (validEntries.length !== entries.length) {
            console.error("Discarding invalid calculator history entries.");
        }

        return validEntries
            .sort((first, second) => second.timestamp - first.timestamp)
            .slice(0, MAX_HISTORY_ENTRIES);
    }

    persistHistory() {
        if (!this.historyStorage) {
            return;
        }

        try {
            this.historyStorage.setItem(
                "calculator.history.v1",
                JSON.stringify(this.history)
            );
        } catch (error) {
            console.error("Unable to save calculator history.", error);
        }
    }

    addHistoryEntry(expression, result) {
        this.history.unshift({
            expression,
            result,
            angle: this.angle,
            timestamp: Math.max(
                Date.now(),
                (this.history[0]?.timestamp ?? 0) + 1
            )
        });
        this.history.length = Math.min(this.history.length, MAX_HISTORY_ENTRIES);
        this.persistHistory();
    }

    clearHistory() {
        this.history = [];
        this.persistHistory();
        this.notify();
    }

    reuseHistoryEntry(entry) {
        if (!this.history.includes(entry)) {
            return false;
        }

        this.pieces = [entry.expression];
        this.expression = entry.expression;
        this.deletedImplicitClosures = 0;
        this.result = entry.result;
        this.angle = entry.angle;
        this.status = "";
        this.isError = false;
        this.justEvaluated = false;
        this.notify();

        return true;
    }

    onChange(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach((listener) => listener());
    }

    insert(value) {
        this.deletedImplicitClosures = 0;

        if (this.isError) {
            this.isError = false;
            this.status = "";
            this.result = "";
        }

        if (this.justEvaluated) {
            const goesOn = CONTINUES.some((op) =>
                value.startsWith(op)
            );

            this.pieces = goesOn ? ["Ans"] : [];
            this.result = "";
            this.isError = false;
            this.status = "";
            this.justEvaluated = false;
        }

        this.pieces.push(value);
        this.expression = this.pieces.join("");

        this.notify();
    }

    deleteLast() {
        const openParentheses = this.openParenthesesToClose();
        if (
            openParentheses !== null &&
            openParentheses > this.deletedImplicitClosures &&
            this.previewResult() !== null
        ) {
            this.deletedImplicitClosures += 1;
            this.notify();
            return;
        }

        this.deletedImplicitClosures = 0;
        this.pieces.pop();
        this.expression = this.pieces.join("");
        this.result = "";
        this.isError = false;
        this.status = "";
        this.justEvaluated = false;

        this.notify();
    }

    clear() {
        this.pieces = [];
        this.expression = "";
        this.deletedImplicitClosures = 0;
        this.result = "0";
        this.status = "";
        this.isError = false;
        this.justEvaluated = false;

        this.notify();
    }

    deleteFunction(name) {
        if (!Object.hasOwn(this.functions, name)) {
            return false;
        }

        delete this.functions[name];
        this.pieces = [];
        this.expression = "";
        this.deletedImplicitClosures = 0;
        this.result = `Deleted ${name}`;
        this.status = "";
        this.isError = false;
        this.justEvaluated = true;
        this.notify();

        return true;
    }

    toggleAngle() {
        this.setAngle(this.angle === "DEG" ? "RAD" : "DEG");
    }

    setAngle(angle) {
        if (angle !== "DEG" && angle !== "RAD") {
            throw new Error(`Invalid angle mode: ${angle}`);
        }

        if (this.angle !== angle) {
            this.angle = angle;
            this.notify();
        }
    }

    openParenthesesToClose() {
        let openParentheses = 0;

        for (const character of this.expression) {
            if (character === "(") {
                openParentheses += 1;
            } else if (character === ")") {
                openParentheses -= 1;
                if (openParentheses < 0) {
                    return null;
                }
            }
        }

        return openParentheses;
    }

    previewResult() {
        if (!this.expression || this.isError || this.justEvaluated) {
            return null;
        }

        const openParentheses = this.openParenthesesToClose();
        if (openParentheses === null) {
            return null;
        }

        try {
            const value = Engine.evaluate(
                this.expression + ")".repeat(openParentheses),
                this.angle,
                {
                    Ans: this.ans,
                    M: this.memory
                },
                this.functions
            );

            return Engine.formatNumber(value);
        } catch (error) {
            if (error instanceof Engine.CalcError) {
                return null;
            }

            throw error;
        }
    }

    calculate() {
        if (this.expression === "") {
            return null;
        }

        const calculationExpression = this.expression;
        const wasJustEvaluated = this.justEvaluated;
        const openParentheses = this.openParenthesesToClose();
        const expressionToEvaluate = openParentheses === null
            ? this.expression
            : this.expression + ")".repeat(openParentheses);
        let value = null;

        try {
            value = Engine.evaluate(
                expressionToEvaluate,
                this.angle,
                {
                    Ans: this.ans,
                    M: this.memory
                },
                this.functions
            );

            this.ans = value;
            this.result = Engine.formatNumber(value);
            this.status = "";
            this.isError = false;
            this.justEvaluated = true;
            this.deletedImplicitClosures = 0;
        } catch (error) {
            this.result = String(error);
            this.status = "";
            this.isError = true;
            this.justEvaluated = false;
            this.deletedImplicitClosures = 0;
            value = null;
        }

        if (value !== null && !wasJustEvaluated) {
            this.addHistoryEntry(calculationExpression, this.result);
        }

        this.notify();

        return value;
    }

    currentValue() {
        if (this.isError) {
            throw new Engine.CalcError(this.result);
        }

        if (this.expression !== "") {
            return Engine.evaluate(
                this.expression,
                this.angle,
                {
                    Ans: this.ans,
                    M: this.memory
                },
                this.functions
            );
        }

        const displayed = Number(this.result);

        if (this.result !== "" && Number.isFinite(displayed)) {
            return displayed;
        }

        throw new Engine.CalcError("no answer yet, press = first");
    }

    memoryAdd(sign = 1) {
        try {
            const value = this.currentValue();
            this.memory = (this.memory ?? 0) + sign * value;
        } catch (error) {
            this.result = String(error);
            this.isError = true;
        }

        this.status = "";
        this.notify();

        return this.memory;
    }

    memoryStore() {
        try {
            this.memory = this.currentValue();
            this.isError = false;
        } catch (error) {
            this.result = String(error);
            this.isError = true;
        }

        this.status = "";
        this.notify();

        return this.memory;
    }

    memoryRecall() {
        if (this.memory === null || this.memory === undefined) {
            this.result = "Error: memory is empty";
            this.status = "";
            this.isError = true;
            this.justEvaluated = false;
            this.notify();
            return null;
        }

        this.insert(`(${Engine.formatNumber(this.memory)})`);
        return this.memory;
    }

    memoryClear() {
        this.memory = null;
        this.status = "";
        this.notify();
    }
}

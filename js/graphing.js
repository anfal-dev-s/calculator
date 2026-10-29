/* Safe function plotting using the calculator's expression engine. */

class CalculatorGraph {
    constructor(model, view, controller) {
        this.model = model;
        this.root = view.root;
        this.controller = controller;
        this.panel = this.root.querySelector("#graph-panel");
        if (!this.panel) {
            throw new Error("The graph panel is missing.");
        }

        this.display = this.root.querySelector(".display");
        this.keys = this.root.querySelector("#keys");
        this.form = this.panel.querySelector(".graph-form");
        this.input = this.panel.querySelector("#graph-expression");
        this.keyToggle = this.panel.querySelector(".graph-key-toggle");
        this.keypad = this.panel.querySelector("#graph-keypad");
        this.message = this.panel.querySelector("#graph-message");
        this.closeButton = this.panel.querySelector(".graph-close");
        this.canvas = this.panel.querySelector(".graph-canvas");
        this.context = this.canvas.getContext("2d");
        this.functionsList = this.panel.querySelector(".graph-functions");
        this.tableBody = this.panel.querySelector(".graph-table tbody");
        this.pointLabel = this.panel.querySelector(".graph-point");
        this.zoomInButton = this.panel.querySelector(".graph-zoom-in");
        this.zoomOutButton = this.panel.querySelector(".graph-zoom-out");
        this.resetButton = this.panel.querySelector(".graph-reset");
        this.historyScreen = this.root.querySelector(".history-screen");
        this.functions = [];
        this.colors = ["#514784", "#d66c79", "#398a78", "#bf7d36", "#477fb0"];
        this.selectedId = null;
        this.nextId = 1;
        this.dismissedCalculatorFunction = null;
        this.scale = 32;
        this.centerX = 0;
        this.centerY = 0;
        this.selectedPoint = null;
        this.pointer = null;
        this.evaluationNotice = null;

        if (!this.panel || !this.display || !this.keys || !this.form ||
            !this.input || !this.keyToggle || !this.keypad || !this.message ||
            !this.closeButton || !this.canvas ||
            !this.context || !this.functionsList || !this.tableBody || !this.pointLabel ||
            !this.zoomInButton || !this.zoomOutButton || !this.resetButton ||
            !this.historyScreen) {
            throw new Error("The graph panel is incomplete or canvas is unavailable.");
        }

        this.controller.addCommand("Graph", () => this.open());
        this.form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.addFunction();
        });
        this.keyToggle.addEventListener("click", () => {
            const expanded = this.keyToggle.getAttribute("aria-expanded") === "true";
            this.keyToggle.setAttribute("aria-expanded", String(!expanded));
            this.keypad.hidden = expanded;
        });
        this.keypad.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button) {
                return;
            }

            if (button.dataset.graphAction === "clear") {
                this.input.value = "";
                this.input.focus();
                return;
            }

            if (button.dataset.graphAction === "backspace") {
                this.deleteInputSelection();
                return;
            }

            if (button.dataset.graphKey) {
                this.insertIntoInput(button.dataset.graphKey);
            }
        });
        this.closeButton.addEventListener("click", () => this.close());
        this.zoomInButton.addEventListener("click", () => this.zoom(1.25));
        this.zoomOutButton.addEventListener("click", () => this.zoom(0.8));
        this.resetButton.addEventListener("click", () => this.resetView());
        this.canvas.addEventListener("pointerdown", (event) => {
            this.startPointer(event);
        });
        this.canvas.addEventListener("pointermove", (event) => {
            this.movePointer(event);
        });
        this.canvas.addEventListener("pointerup", (event) => {
            this.endPointer(event);
        });
        this.canvas.addEventListener("pointercancel", () => {
            this.pointer = null;
        });
        this.canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            const bounds = this.canvas.getBoundingClientRect();
            this.zoomAt(
                event.deltaY < 0 ? 1.12 : 1 / 1.12,
                event.clientX - bounds.left,
                event.clientY - bounds.top
            );
        }, { passive: false });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isOpen()) {
                this.close();
            }
        });
        document.addEventListener("calculator-theme-change", () => this.draw());

        this.resizeObserver = new ResizeObserver(() => this.draw());
        this.resizeObserver.observe(this.canvas);
    }

    isOpen() {
        return this.panel.classList.contains("is-visible");
    }

    open() {
        if (this.isOpen()) {
            return;
        }

        if (this.historyScreen.classList.contains("is-visible")) {
            return;
        }

        this.panel.classList.add("is-visible");
        this.panel.setAttribute("aria-hidden", "false");
        this.panel.inert = false;
        this.display.inert = true;
        this.keys.inert = true;
        this.syncCalculatorFunction();
        this.input.focus();
        this.renderFunctions();
        this.draw();
        this.closeButton.focus();
    }

    syncCalculatorFunction() {
        const savedFunction = this.model.functions.f;
        const existing = this.functions.find((item) => item.source === "calculator");

        if (!savedFunction) {
            this.dismissedCalculatorFunction = null;
            if (existing) {
                this.functions = this.functions.filter(
                    (item) => item.source !== "calculator"
                );
                if (this.selectedId === existing.id) {
                    this.selectedId = this.functions[0]?.id ?? null;
                }
                this.selectedPoint = null;
            }
            return;
        }

        const expression = savedFunction[1];
        if (expression === this.dismissedCalculatorFunction) {
            return;
        }

        this.dismissedCalculatorFunction = null;
        if (existing) {
            existing.expression = expression;
            this.selectedId = existing.id;
            this.selectedPoint = null;
            return;
        }

        const item = {
            id: this.nextId++,
            expression,
            color: this.colors[this.functions.length % this.colors.length],
            source: "calculator"
        };
        this.functions.push(item);
        this.selectedId = item.id;
        this.selectedPoint = null;
    }

    close() {
        if (!this.isOpen()) {
            return;
        }

        this.panel.classList.remove("is-visible");
        this.panel.setAttribute("aria-hidden", "true");
        this.panel.inert = true;
        this.display.inert = false;
        this.keys.inert = false;
        this.controller.view.graphButton.focus();
    }

    addFunction() {
        const expression = this.input.value.trim();

        if (!expression) {
            this.showMessage("Enter a function of x, for example x^2.", true);
            return;
        }

        if (expression.length > 100) {
            this.showMessage("Functions must be 100 characters or fewer.", true);
            return;
        }

        try {
            Engine.check(expression, "x", this.model.functions);
        } catch (error) {
            this.showMessage(String(error), true);
            this.input.focus();
            return;
        }

        const item = {
            id: this.nextId++,
            expression,
            color: this.colors[this.functions.length % this.colors.length]
        };
        this.functions.push(item);
        this.selectedId = item.id;
        this.selectedPoint = null;
        this.input.value = "";
        this.showMessage(`Plotted y = ${expression}.`);
        this.renderFunctions();
        this.draw();
    }

    insertIntoInput(value) {
        const start = this.input.selectionStart ?? this.input.value.length;
        const end = this.input.selectionEnd ?? start;
        this.input.setRangeText(value, start, end, "end");
        this.input.focus();
    }

    deleteInputSelection() {
        const start = this.input.selectionStart ?? this.input.value.length;
        const end = this.input.selectionEnd ?? start;

        if (start === end && start > 0) {
            this.input.setRangeText("", start - 1, start, "end");
        } else {
            this.input.setRangeText("", start, end, "end");
        }

        this.input.focus();
    }

    showMessage(message, isError = false) {
        this.message.textContent = message;
        this.message.classList.toggle("is-error", isError);
    }

    renderFunctions() {
        const items = this.functions.map((item) => {
            const row = document.createElement("div");
            const select = document.createElement("button");
            const swatch = document.createElement("span");
            const expression = document.createElement("span");
            const remove = document.createElement("button");

            row.className = "graph-function";
            select.type = "button";
            select.className = "graph-function-select";
            select.setAttribute("role", "listitem");
            select.setAttribute(
                "aria-pressed",
                String(item.id === this.selectedId)
            );
            swatch.className = "graph-swatch";
            swatch.style.backgroundColor = item.color;
            swatch.setAttribute("aria-hidden", "true");
            expression.className = "graph-function-expression";
            expression.textContent = item.source === "calculator"
                ? `f(x) = ${item.expression}`
                : `y = ${item.expression}`;
            remove.type = "button";
            remove.className = "graph-function-remove";
            remove.setAttribute(
                "aria-label",
                `Remove ${item.source === "calculator" ? "f(x)" : "y"} = ${item.expression}`
            );
            remove.textContent = "×";
            select.append(swatch, expression);
            select.addEventListener("click", () => {
                this.selectedId = item.id;
                this.selectedPoint = null;
                this.renderFunctions();
                this.renderTable();
                this.draw();
            });
            remove.addEventListener("click", () => {
                if (item.source === "calculator") {
                    this.dismissedCalculatorFunction = item.expression;
                }
                this.functions = this.functions.filter(
                    (entry) => entry.id !== item.id
                );
                if (this.selectedId === item.id) {
                    this.selectedId = this.functions[0]?.id ?? null;
                    this.selectedPoint = null;
                }
                this.renderFunctions();
                this.renderTable();
                this.draw();
            });
            row.append(select, remove);

            return row;
        });

        this.functionsList.replaceChildren(...items);
        this.renderTable();
    }

    get selectedFunction() {
        return this.functions.find((item) => item.id === this.selectedId) ?? null;
    }

    evaluate(expression, x) {
        return Engine.evaluate(
            expression,
            this.model.angle,
            { x },
            this.model.functions
        );
    }

    getCanvasSize() {
        const bounds = this.canvas.getBoundingClientRect();
        return {
            width: Math.max(1, bounds.width),
            height: Math.max(1, bounds.height)
        };
    }

    draw() {
        if (!this.context || !this.canvas.isConnected) {
            return;
        }

        const { width, height } = this.getCanvasSize();
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.context.clearRect(0, 0, width, height);
        this.drawGrid(width, height);

        this.evaluationNotice = null;
        let selectedValidSamples = null;
        for (const item of this.functions) {
            const validSamples = this.drawFunction(item, width, height);
            if (item.id === this.selectedId) {
                selectedValidSamples = validSamples;
            }
        }

        if (this.evaluationNotice) {
            this.showMessage(this.evaluationNotice, true);
        } else if (selectedValidSamples === 0) {
            this.showMessage(
                "No real values for the selected function in this view.",
                true
            );
        } else if (
            this.message.textContent.startsWith("No real values for the selected function") ||
            this.message.textContent.startsWith("Unable to evaluate y =")
        ) {
            this.showMessage("");
        }

        if (this.selectedPoint) {
            this.drawSelectedPoint(width, height);
        }

        this.renderTable();
    }

    drawGrid(width, height) {
        const context = this.context;
        const colors = getComputedStyle(this.root);
        context.fillStyle = colors.getPropertyValue("--graph-canvas").trim();
        context.fillRect(0, 0, width, height);
        context.font = "10px Segoe UI, sans-serif";

        const step = this.getGridStep();
        const firstX = Math.floor(this.centerX - width / (2 * this.scale) / step) * step;
        const lastX = this.centerX + width / (2 * this.scale);
        const firstY = Math.floor(this.centerY - height / (2 * this.scale) / step) * step;
        const lastY = this.centerY + height / (2 * this.scale);

        context.lineWidth = 1;
        context.strokeStyle = colors.getPropertyValue("--graph-grid").trim();
        context.fillStyle = colors.getPropertyValue("--graph-label").trim();
        context.beginPath();

        for (let x = firstX; x <= lastX; x += step) {
            const px = this.toCanvasX(x, width);
            context.moveTo(px, 0);
            context.lineTo(px, height);
        }

        for (let y = firstY; y <= lastY; y += step) {
            const py = this.toCanvasY(y, height);
            context.moveTo(0, py);
            context.lineTo(width, py);
        }

        context.stroke();
        context.strokeStyle = colors.getPropertyValue("--graph-axis").trim();
        context.lineWidth = 1.5;
        context.beginPath();
        const axisX = this.toCanvasX(0, width);
        const axisY = this.toCanvasY(0, height);
        if (axisX >= 0 && axisX <= width) {
            context.moveTo(axisX, 0);
            context.lineTo(axisX, height);
        }
        if (axisY >= 0 && axisY <= height) {
            context.moveTo(0, axisY);
            context.lineTo(width, axisY);
        }
        context.stroke();

        context.textAlign = "center";
        context.textBaseline = "top";
        for (let x = firstX; x <= lastX; x += step) {
            if (Math.abs(x) < step / 100) {
                continue;
            }
            const px = this.toCanvasX(x, width);
            if (px > 14 && px < width - 14 && axisY + 4 < height - 12) {
                context.fillText(Engine.formatNumber(x), px, axisY + 4);
            }
        }
        context.textAlign = "right";
        context.textBaseline = "middle";
        for (let y = firstY; y <= lastY; y += step) {
            if (Math.abs(y) < step / 100) {
                continue;
            }
            const py = this.toCanvasY(y, height);
            if (axisX - 5 > 30 && py > 10 && py < height - 10) {
                context.fillText(Engine.formatNumber(y), axisX - 5, py);
            }
        }
    }

    drawFunction(item, width, height) {
        const context = this.context;
        const samples = Math.ceil(width * 1.5);
        let drawing = false;
        let previousY = null;
        let validSamples = 0;
        context.beginPath();
        context.lineWidth = item.id === this.selectedId ? 2.5 : 2;
        context.strokeStyle = item.color;

        for (let index = 0; index <= samples; index++) {
            const px = (index / samples) * width;
            const x = this.centerX + (px - width / 2) / this.scale;

            try {
                const y = this.evaluate(item.expression, x);
                const py = this.toCanvasY(y, height);
                validSamples++;

                if (!Number.isFinite(py) || Math.abs(py) > height * 8 ||
                    (previousY !== null && Math.abs(py - previousY) > height * 1.2)) {
                    drawing = false;
                    previousY = py;
                    continue;
                }

                if (drawing) {
                    context.lineTo(px, py);
                } else {
                    context.moveTo(px, py);
                    drawing = true;
                }
                previousY = py;
            } catch (error) {
                if (!(error instanceof Engine.MathErr)) {
                    this.evaluationNotice =
                        `Unable to evaluate y = ${item.expression}: ${error.message}`;
                    context.stroke();
                    return 0;
                }
                drawing = false;
                previousY = null;
            }
        }

        context.stroke();
        return validSamples;
    }

    drawSelectedPoint(width, height) {
        const point = this.selectedPoint;
        const item = this.selectedFunction;
        if (!point || !item) {
            return;
        }
        const px = this.toCanvasX(point.x, width);
        const py = this.toCanvasY(point.y, height);
        if (px < 0 || px > width || py < 0 || py > height) {
            return;
        }

        this.context.beginPath();
        this.context.arc(px, py, 5, 0, Math.PI * 2);
        this.context.fillStyle = item.color;
        this.context.fill();
        this.context.lineWidth = 2;
        this.context.strokeStyle = getComputedStyle(this.root)
            .getPropertyValue("--graph-point-outline")
            .trim();
        this.context.stroke();
    }

    getGridStep() {
        const raw = 72 / this.scale;
        const power = Math.pow(10, Math.floor(Math.log10(raw)));
        const normalized = raw / power;
        return (normalized < 2 ? 1 : normalized < 5 ? 2 : 5) * power;
    }

    toCanvasX(x, width) {
        return (x - this.centerX) * this.scale + width / 2;
    }

    toCanvasY(y, height) {
        return height / 2 - (y - this.centerY) * this.scale;
    }

    renderTable() {
        const item = this.selectedFunction;
        if (!item) {
            this.tableBody.replaceChildren();
            return;
        }

        const step = this.getGridStep();
        const center = this.selectedPoint?.x ?? this.centerX;
        const rows = [];

        for (let index = 0; index < 5; index++) {
            const x = center + step * (index - 2);
            const row = document.createElement("tr");
            const xCell = document.createElement("td");
            const yCell = document.createElement("td");
            xCell.textContent = Engine.formatNumber(x);

            try {
                yCell.textContent = Engine.formatNumber(
                    this.evaluate(item.expression, x)
                );
            } catch (error) {
                yCell.textContent = "—";
                if (!(error instanceof Engine.MathErr)) {
                    this.showMessage(
                        `Unable to evaluate y = ${item.expression}: ${error.message}`,
                        true
                    );
                }
            }

            row.append(xCell, yCell);
            rows.push(row);
        }

        this.tableBody.replaceChildren(...rows);
    }

    zoom(factor) {
        const { width, height } = this.getCanvasSize();
        this.zoomAt(factor, width / 2, height / 2);
    }

    zoomAt(factor, px, py) {
        const { width, height } = this.getCanvasSize();
        const beforeX = this.centerX + (px - width / 2) / this.scale;
        const beforeY = this.centerY - (py - height / 2) / this.scale;
        this.scale = Math.min(240, Math.max(4, this.scale * factor));
        this.centerX = beforeX - (px - width / 2) / this.scale;
        this.centerY = beforeY + (py - height / 2) / this.scale;
        this.draw();
    }

    resetView() {
        this.centerX = 0;
        this.centerY = 0;
        this.scale = 32;
        this.selectedPoint = null;
        this.pointLabel.textContent = "Select a curve point.";
        this.draw();
    }

    startPointer(event) {
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
            return;
        }

        this.pointer = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };
        this.canvas.setPointerCapture(event.pointerId);
    }

    movePointer(event) {
        if (!this.pointer || event.pointerId !== this.pointer.id) {
            return;
        }

        const dx = event.clientX - this.pointer.x;
        const dy = event.clientY - this.pointer.y;
        if (Math.hypot(
            event.clientX - this.pointer.startX,
            event.clientY - this.pointer.startY
        ) > 4) {
            this.pointer.moved = true;
        }
        if (this.pointer.moved) {
            this.centerX -= dx / this.scale;
            this.centerY += dy / this.scale;
            this.draw();
        }
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
    }

    endPointer(event) {
        if (!this.pointer || event.pointerId !== this.pointer.id) {
            return;
        }

        const pointer = this.pointer;
        this.pointer = null;
        if (!pointer.moved) {
            const bounds = this.canvas.getBoundingClientRect();
            this.inspectPoint(
                event.clientX - bounds.left,
                event.clientY - bounds.top
            );
        }
    }

    inspectPoint(px, py) {
        const item = this.selectedFunction;
        if (!item) {
            this.showMessage("Plot a function first.", true);
            return;
        }

        const { width, height } = this.getCanvasSize();
        const xAtPointer = this.centerX + (px - width / 2) / this.scale;
        let closest = null;
        for (let offset = -10; offset <= 10; offset++) {
            const x = Math.round(xAtPointer * this.scale + offset) / this.scale;
            try {
                const y = this.evaluate(item.expression, x);
                const distance = Math.hypot(
                    this.toCanvasX(x, width) - px,
                    this.toCanvasY(y, height) - py
                );
                if (!closest || distance < closest.distance) {
                    closest = { x, y, distance };
                }
            } catch {
                continue;
            }
        }

        if (!closest || closest.distance > 24) {
            this.pointLabel.textContent = "No curve near that point.";
            this.selectedPoint = null;
            this.draw();
            return;
        }

        this.selectedPoint = { x: closest.x, y: closest.y };
        this.pointLabel.textContent =
            `x = ${Engine.formatNumber(closest.x)}, ` +
            `f(x) = ${Engine.formatNumber(closest.y)}`;
        this.draw();
    }
}

window.extend({
    install({ model, view, controller }) {
        new CalculatorGraph(model, view, controller);
    }
});

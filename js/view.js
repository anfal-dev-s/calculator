
const KEYS = {
    basic: [
        [
            ["AC", null, "clear"],
            ["%", null, "func"],
            ["÷", null, "op"],
            ["×", null, "op"]
        ],
        [
            ["7", "7", "digit"],
            ["8", "8", "digit"],
            ["9", "9", "digit"],
            ["−", null, "op"]
        ],
        [
            ["4", "4", "digit"],
            ["5", "5", "digit"],
            ["6", "6", "digit"],
            ["+", null, "op"]
        ],
        [
            ["1", "1", "digit"],
            ["2", "2", "digit"],
            ["3", "3", "digit"],
            ["=", null, "equal"]
        ],
        [
            ["()", null, "func"],
            ["0", "0", "digit"],
            [".", ".", "digit"],
        ]
    ],

    scientific: [
        [
            ["log", null, "func"],
            ["sin", null, "func"],
            ["cos", null, "func"],
            ["tan", null, "func"]
        ]
    ],
    scientificSide: [
        ["ln", null, "func"],
        ["!", null, "func"],
        ["^", null, "func"],
        ["√", null, "func"],
        ["π", null, "func"],
        ["e", null, "func"],
        ["x", "x", "func"]
    ],

    memory: [
        ["MC", null, "memory"],
        ["MR", null, "memory"],
        ["M+", null, "memory"],
        ["M−", null, "memory"],
        ["MS", null, "memory"]
    ]
};

class CalculatorView {
    constructor(root, keys) {
        this.root = root;
        this.status = root.querySelector("#status");
        this.memoryIndicator = root.querySelector("#memory-indicator");
        this.expression = root.querySelector("#expression");
        this.result = root.querySelector("#result");
        this.keys = root.querySelector("#keys");
        this.display = root.querySelector("#display");
        this.converterPanel = root.querySelector("#converter-panel");
        this.calculatorModeTab = root.querySelector("#calculator-mode");
        this.conversionModeTab = root.querySelector("#conversion-mode");
        this.clearButton = root.querySelector("#display-clear");

        this.pressHandler = null;
        this.displayActionHandler = null;
        this.angleToggleHandler = null;
        this.functionArgumentClickHandler = null;
        this.scientificMode = false;
        this.scientificNotation = false;
        this.buttons = [];
        this.scientificButtons = [];
        this.basicButtons = [];
        this.layoutAnimations = new Map();
        this.keys.classList.add("standard-mode");

        this.buildKeypad(keys);
        this.calculatorModeTab.addEventListener("click", () => {
            this.setApplicationMode("calculator");
        });
        this.conversionModeTab.addEventListener("click", () => {
            this.setApplicationMode("conversion");
        });
        this.expression.addEventListener("click", (event) => {
            if (event.target.closest(".function-argument-target")) {
                this.functionArgumentClickHandler?.();
            }
        });

        if (this.clearButton) {
            this.clearButton.addEventListener("click", () => {
                if (this.displayActionHandler) {
                    this.displayActionHandler();
                }
            });
        }

        this.status.addEventListener("click", () => {
            if (this.angleToggleHandler) {
                this.angleToggleHandler();
            }
        });
    }

    createButton(item, container) {
        const [label, text = null, group = "func"] = item;

        const button = document.createElement("button");

        button.type = "button";
        button.className = `key key--${group}`;
        button.textContent = label === "DEL" ? "⌫" : label;
        button.dataset.key = label;
        button.dataset.label = label;
        button.dataset.text = text ?? "";

        if (label.length > 5) {
            button.classList.add("key--small");
        }

        const spoken = {
            "√": "Square root",
            "π": "Pi",
            "f(x)": "Insert a custom function definition",
            "SHIFT": "Toggle shifted calculator functions",
            "|x|": "Absolute value",
            "AC": "All clear",
            "DEL": "Delete last entry",
            "DEG/RAD": "Toggle degrees or radians",
            "INV": "Inverse trigonometric functions"
        };

        if (spoken[label]) {
            button.setAttribute("aria-label", spoken[label]);
        }

        button.addEventListener("mousedown", (event) => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            if (this.pressHandler) {
                this.pressHandler(label, text);
            }
        });

        container.appendChild(button);
        this.buttons.push(button);

        return button;
    }

    buildKeypad(keys) {
        const toolbar = document.createElement("div");
        toolbar.className = "keypad-toolbar";

        const modeControls = document.createElement("div");
        modeControls.className = "mode-controls";
        modeControls.setAttribute("role", "group");
        modeControls.setAttribute("aria-label", "Calculator mode");
        this.modeToggle = this.createButton(
            ["SCI", null, "mode"],
            modeControls
        );
        this.modeIndicator = document.createElement("span");
        this.modeIndicator.setAttribute("aria-hidden", "true");
        this.modeToggle.replaceChildren(this.modeIndicator);
        this.modeToggle.dataset.modeShort = "ST";
        this.modeToggle.setAttribute(
            "aria-label",
            "Current mode: Standard. Switch to scientific mode"
        );
        this.modeToggle.title = "Standard mode — switch to scientific mode";
        this.modeToggle.setAttribute("aria-pressed", "false");
        toolbar.appendChild(modeControls);

        this.functionButton = this.createButton(
            ["f(x)", null, "toolbar"],
            toolbar
        );
        this.functionButton.setAttribute(
            "aria-label",
            "Insert a custom function definition"
        );

        this.deleteFunctionButton = this.createButton(
            ["DEL_F", null, "toolbar"],
            toolbar
        );
        this.deleteFunctionButton.classList.add("function-delete-button");
        this.deleteFunctionButton.textContent = "Delete f";
        this.deleteFunctionButton.hidden = true;
        this.deleteFunctionButton.title = "Delete the saved f(x) function";
        this.deleteFunctionButton.setAttribute(
            "aria-label",
            "Delete saved function f"
        );

        this.graphButton = this.createButton(
            ["Graph", null, "toolbar"],
            toolbar
        );
        this.graphButton.classList.add("graph-button");
        this.graphButton.title = "Open function graph";
        this.graphButton.setAttribute("aria-label", "Open function graph");

        const memoryRow = document.createElement("div");
        memoryRow.className = "memory-row";
        memoryRow.setAttribute("role", "group");
        memoryRow.setAttribute("aria-label", "Memory");
        keys.memory.forEach((item) => this.createButton(item, memoryRow));

        const keypadGrid = document.createElement("div");
        keypadGrid.className = "keypad-grid";

        keys.scientific.forEach((row, rowIndex) => {
            row.forEach((item, columnIndex) => {
                const button = this.createButton(item, keypadGrid);
                button.classList.add(
                    "key--scientific",
                    "key--scientific-top"
                );
                button.dataset.scientific = "true";
                button.inert = true;
                button.setAttribute("aria-hidden", "true");
                button.style.setProperty("--layout-row", String(rowIndex + 1));
                button.style.setProperty(
                    "--layout-column",
                    String(columnIndex + 2)
                );
                button.style.setProperty(
                    "--scientific-top-index",
                    String(columnIndex + 2)
                );
                button.style.setProperty("--layout-span", "1");
                this.scientificButtons.push(button);
                button.style.setProperty(
                    "--key-index",
                    String(this.scientificButtons.length - 1)
                );
            });
        });

        keys.scientificSide.forEach((item, rowIndex) => {
            const button = this.createButton(item, keypadGrid);
            button.classList.add("key--scientific");
            button.dataset.scientific = "true";
            button.inert = true;
            button.setAttribute("aria-hidden", "true");
            button.style.setProperty("--layout-row", String(rowIndex + 2));
            button.style.setProperty(
                "--layout-row-span",
                item[0] === "x" ? "3" : "2"
            );
            button.style.setProperty("--layout-column", "1");
            button.style.setProperty("--layout-span", "1");
            this.scientificButtons.push(button);
            button.style.setProperty(
                "--key-index",
                String(this.scientificButtons.length - 1)
            );
        });

        this.shiftButton = this.createButton(
            ["SHIFT", null, "func"],
            keypadGrid
        );
        this.shiftButton.textContent = "Shift";
        this.shiftButton.classList.add("key--scientific", "key--shift");
        this.shiftButton.classList.add("key--scientific-top");
        this.shiftButton.dataset.scientific = "true";
        this.shiftButton.inert = true;
        this.shiftButton.setAttribute("aria-hidden", "true");
        this.shiftButton.setAttribute("aria-pressed", "false");
        this.shiftButton.setAttribute(
            "aria-label",
            "Shift inactive: activate to use alternate functions"
        );
        this.shiftButton.title =
            "Shift is off — activate to use alternate functions";
        this.shiftButton.style.setProperty("--layout-row", "1");
        this.shiftButton.style.setProperty("--layout-column", "1");
        this.shiftButton.style.setProperty("--scientific-top-index", "0");
        this.shiftButton.style.setProperty("--layout-span", "1");
        this.shiftButton.style.setProperty(
            "--key-index",
            String(this.scientificButtons.length)
        );
        this.scientificButtons.push(this.shiftButton);

        this.scientificNotationButton = this.createButton(
            ["SCI-NOTATION", null, "func"],
            keypadGrid
        );
        this.scientificNotationButton.textContent = "SCI";
        this.scientificNotationButton.classList.add(
            "key--scientific",
            "key--sci-notation",
            "key--scientific-top"
        );
        this.scientificNotationButton.dataset.scientific = "true";
        this.scientificNotationButton.inert = true;
        this.scientificNotationButton.setAttribute("aria-hidden", "true");
        this.scientificNotationButton.setAttribute(
            "aria-label",
            "Scientific notation off: show results in scientific notation"
        );
        this.scientificNotationButton.title =
            "Show results in scientific notation";
        this.scientificNotationButton.setAttribute("aria-pressed", "false");
        this.scientificNotationButton.style.setProperty("--layout-row", "1");
        this.scientificNotationButton.style.setProperty(
            "--layout-column",
            "2"
        );
        this.scientificNotationButton.style.setProperty(
            "--scientific-top-index",
            "1"
        );
        this.scientificNotationButton.style.setProperty(
            "--layout-span",
            "1"
        );
        this.scientificNotationButton.style.setProperty(
            "--key-index",
            String(this.scientificButtons.length)
        );
        this.scientificButtons.push(this.scientificNotationButton);

        keys.basic.forEach((row, rowIndex) => {
            let columnIndex = 0;
            row.forEach((item) => {
                const button = this.createButton(item, keypadGrid);
                const span = item[3] || 1;
                button.style.setProperty("--layout-row", String(rowIndex + 2));
                button.style.setProperty(
                    "--layout-column",
                    String(columnIndex + 2)
                );
                button.style.setProperty(
                    "--layout-span",
                    String(span)
                );
                button.style.setProperty(
                    "--basic-row",
                    String(rowIndex + 1)
                );
                button.style.setProperty(
                    "--basic-column",
                    String(columnIndex + 1)
                );
                button.style.setProperty("--basic-span", String(span));
                if (item[0] === "=") {
                    button.style.setProperty("--basic-row", "4");
                    button.style.setProperty("--basic-span", "1");
                }
                this.basicButtons.push(button);
                columnIndex += span;
            });
        });

        this.keys.replaceChildren(toolbar, memoryRow, keypadGrid);
    }

    setScientificMode(enabled) {
        if (this.scientificMode === enabled) {
            return;
        }

        const states = new Map(
            [...this.scientificButtons, ...this.basicButtons].map((button) => {
                const rect = button.getBoundingClientRect();
                return [button, {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    opacity: Number(getComputedStyle(button).opacity)
                }];
            })
        );
        this.layoutAnimations.forEach((animation) => animation.cancel());
        this.layoutAnimations.clear();

        this.scientificButtons.forEach((button) => {
            button.style.visibility = enabled ? "" : "visible";
        });

        this.scientificMode = enabled;
        this.keys.classList.toggle("scientific-mode", enabled);
        this.keys.classList.toggle("standard-mode", !enabled);
        this.root.classList.toggle("scientific-mode", enabled);
        this.modeToggle.classList.toggle("is-selected", enabled);
        this.modeToggle.dataset.modeShort = enabled ? "SC" : "ST";
        this.modeToggle.setAttribute(
            "aria-label",
            enabled
                ? "Current mode: Scientific. Switch to standard mode"
                : "Current mode: Standard. Switch to scientific mode"
        );
        this.modeToggle.title = enabled
            ? "Scientific mode — switch to standard mode"
            : "Standard mode — switch to scientific mode";
        this.modeToggle.setAttribute("aria-pressed", String(enabled));

        const hidingFocusedButton =
            !enabled && this.scientificButtons.includes(document.activeElement);

        this.scientificButtons.forEach((button) => {
            button.inert = !enabled;
            button.setAttribute("aria-hidden", String(!enabled));
        });

        if (hidingFocusedButton) {
            this.modeToggle.focus();
        }

        const scientificAnimationOrder = new Map(
            [...this.scientificButtons]
                .sort((first, second) => {
                    const rowDifference =
                        Number(first.style.getPropertyValue("--layout-row")) -
                        Number(second.style.getPropertyValue("--layout-row"));
                    return rowDifference ||
                        Number(first.style.getPropertyValue("--layout-column")) -
                        Number(second.style.getPropertyValue("--layout-column"));
                })
                .map((button, index) => [button, index])
        );

        [...this.scientificButtons, ...this.basicButtons].forEach((button) => {
            const previous = states.get(button);
            const current = button.getBoundingClientRect();
            const deltaX = previous.x - current.left;
            const deltaY = previous.y - current.top;
            const scaleX = previous.width / current.width;
            const scaleY = previous.height / current.height;
            const isScientificButton = this.scientificButtons.includes(button);
            const targetOpacity = enabled ? 1 : 0;
            const opacityChanged =
                isScientificButton &&
                Math.abs(previous.opacity - targetOpacity) > 0.01;

            if (
                Math.abs(deltaX) < 1 &&
                Math.abs(deltaY) < 1 &&
                Math.abs(scaleX - 1) < 0.01 &&
                Math.abs(scaleY - 1) < 0.01 &&
                !opacityChanged
            ) {
                return;
            }

            const offsetX = deltaX + (previous.width - current.width) / 2;
            const offsetY = deltaY + (previous.height - current.height) / 2;
            const scientificIndex = scientificAnimationOrder.get(button) ?? 0;
            const animation = button.animate(
                [
                    {
                        transform:
                            `translate(${offsetX}px, ${offsetY}px) ` +
                            `scale(${scaleX * (isScientificButton ? 0.84 : 1)}, ` +
                            `${scaleY * (isScientificButton ? 0.84 : 1)})`,
                        opacity: isScientificButton
                            ? previous.opacity
                            : 1
                    },
                    {
                        transform: "translate(0, 0) scale(1, 1)",
                        opacity: isScientificButton ? targetOpacity : 1
                    }
                ],
                {
                    duration: enabled
                        ? isScientificButton ? 440 : 480
                        : isScientificButton ? 300 : 360,
                    delay: enabled && isScientificButton
                        ? 90 + scientificIndex * 22
                        : 0,
                    easing: enabled
                        ? "cubic-bezier(0.16, 1, 0.3, 1)"
                        : "cubic-bezier(0.22, 1, 0.36, 1)",
                    fill: "both"
                }
            );
            this.layoutAnimations.set(button, animation);
            animation.onfinish = () => {
                if (this.layoutAnimations.get(button) === animation) {
                    this.layoutAnimations.delete(button);
                    animation.cancel();
                    if (isScientificButton) {
                        button.style.visibility = "";
                    }
                }
            };
        });
    }

    onPress(handler) {
        this.pressHandler = handler;
    }

    setApplicationMode(mode) {
        const isConversion = mode === "conversion";
        this.root.classList.toggle("conversion-mode", isConversion);
        this.display.hidden = isConversion;
        this.display.inert = isConversion;
        this.display.setAttribute("aria-hidden", String(isConversion));
        this.keys.hidden = isConversion;
        this.keys.inert = isConversion;
        this.keys.setAttribute("aria-hidden", String(isConversion));
        this.converterPanel.hidden = !isConversion;
        this.converterPanel.inert = !isConversion;
        this.converterPanel.setAttribute("aria-hidden", String(!isConversion));
        this.calculatorModeTab.classList.toggle("is-active", !isConversion);
        this.calculatorModeTab.setAttribute(
            "aria-pressed",
            String(!isConversion)
        );
        this.conversionModeTab.classList.toggle("is-active", isConversion);
        this.conversionModeTab.setAttribute(
            "aria-pressed",
            String(isConversion)
        );
    }

    onDisplayAction(handler) {
        this.displayActionHandler = handler;
    }

    onAngleToggle(handler) {
        this.angleToggleHandler = handler;
    }

    onFunctionArgumentClick(handler) {
        this.functionArgumentClickHandler = handler;
    }

    setShiftMode(enabled) {
        const inverseLabels = {
            sin: "sin⁻¹",
            cos: "cos⁻¹",
            tan: "tan⁻¹"
        };

        for (const [normal, inverse] of Object.entries(inverseLabels)) {
            const button = this.buttons.find(
                (item) => item.dataset.label === normal
            );

            if (button) {
                button.textContent = enabled ? inverse : normal;
                button.setAttribute(
                    "aria-label",
                    enabled ? inverse : normal
                );

                button.classList.toggle("is-inverse", enabled);
            }

        }

        this.shiftButton.classList.toggle("is-selected", enabled);
        this.shiftButton.setAttribute("aria-pressed", String(enabled));
        this.shiftButton.setAttribute(
            "aria-label",
            enabled
                ? "Shift active: inverse trigonometric functions, custom-base logarithm, nth root, and absolute value"
                : "Shift inactive: activate to use alternate functions"
        );
        this.shiftButton.title = enabled
            ? "Shift is on — inverse trigonometric functions, custom-base logarithm, nth root, and absolute value"
            : "Shift is off — activate to use alternate functions";

        const absoluteValueButton = this.buttons.find(
            (button) => button.dataset.label === "x"
        );

        if (absoluteValueButton) {
            absoluteValueButton.textContent = enabled ? "|x|" : "x";
            absoluteValueButton.setAttribute(
                "aria-label",
                enabled ? "Absolute value" : "x"
            );
        }

        const rootButton = this.buttons.find(
            (button) => button.dataset.label === "√"
        );
        if (rootButton) {
            rootButton.textContent = enabled ? "ⁿ√" : "√";
            rootButton.setAttribute(
                "aria-label",
                enabled ? "Nth root" : "Square root"
            );
        }

        const logButton = this.buttons.find(
            (button) => button.dataset.label === "log"
        );
        if (logButton) {
            logButton.textContent = enabled ? "logₐ" : "log";
            logButton.setAttribute(
                "aria-label",
                enabled ? "Logarithm with custom base" : "Common logarithm"
            );
        }
    }

    toggleScientificNotation() {
        this.scientificNotation = !this.scientificNotation;
        this.scientificNotationButton.classList.toggle(
            "is-selected",
            this.scientificNotation
        );
        this.scientificNotationButton.setAttribute(
            "aria-pressed",
            String(this.scientificNotation)
        );
        this.scientificNotationButton.setAttribute(
            "aria-label",
            this.scientificNotation
                ? "Scientific notation on: show results in standard notation"
                : "Scientific notation off: show results in scientific notation"
        );
        this.scientificNotationButton.title = this.scientificNotation
            ? "Show results in standard notation"
            : "Show results in scientific notation";
    }

    flash(label) {
        const button = this.buttons.find(
            (item) => item.dataset.label === label
        );

        if (!button) {
            return;
        }

        button.classList.add("key--flash");

        setTimeout(() => {
            button.classList.remove("key--flash");
        }, 150);
    }

    renderExpression(source, target = this.expression) {
        const appendText = (text, target) => {
            target.append(
                document.createTextNode(
                    text
                        .replace(/\bpi\b/g, "π")
                        .replace(/sqrt\(/g, "√(")
                        .replace(/asin\(/g, "sin⁻¹(")
                        .replace(/acos\(/g, "cos⁻¹(")
                        .replace(/atan\(/g, "tan⁻¹(")
                        .replace(/\*/g, " × ")
                        .replace(/\//g, " ÷ ")
                        .replace(/-/g, " − ")
                )
            );
        };

        const renderPart = (text, target) => {
            let position = 0;

            while (position < text.length) {
                const rootStart = text.indexOf("nthroot(", position);
                const absoluteStart = text.indexOf("abs(", position);
                const logBaseStart = text.indexOf("logbase(", position);
                const functionStarts = [
                    rootStart,
                    absoluteStart,
                    logBaseStart
                ].filter((start) => start !== -1);
                const functionStart = functionStarts.length
                    ? Math.min(...functionStarts)
                    : -1;

                if (functionStart === -1) {
                    appendText(text.slice(position), target);
                    return;
                }

                appendText(text.slice(position, functionStart), target);

                if (functionStart === absoluteStart) {
                    let depth = 1;
                    let close = -1;

                    for (
                        let index = absoluteStart + "abs(".length;
                        index < text.length;
                        index++
                    ) {
                        if (text[index] === "(") {
                            depth += 1;
                        } else if (text[index] === ")") {
                            depth -= 1;
                            if (depth === 0) {
                                close = index;
                                break;
                            }
                        }
                    }

                    const end = close === -1 ? text.length : close;
                    const value = text.slice(
                        absoluteStart + "abs(".length,
                        end
                    );
                    target.append(document.createTextNode("|"));
                    if (value) {
                        renderPart(value, target);
                    } else {
                        const placeholder = document.createElement("span");
                        placeholder.setAttribute("aria-hidden", "true");
                        placeholder.textContent = "□";
                        target.append(placeholder);
                    }
                    target.append(document.createTextNode("|"));
                    position = close === -1 ? text.length : close + 1;
                    continue;
                }

                if (functionStart === logBaseStart) {
                    const argumentStart = logBaseStart + "logbase(".length;
                    let depth = 1;
                    let comma = -1;
                    let close = -1;

                    for (let index = argumentStart; index < text.length; index++) {
                        if (text[index] === "(") {
                            depth += 1;
                        } else if (text[index] === ")") {
                            depth -= 1;
                            if (depth === 0) {
                                close = index;
                                break;
                            }
                        } else if (text[index] === "," && depth === 1 && comma === -1) {
                            comma = index;
                        }
                    }

                    const baseEnd = comma !== -1
                        ? comma
                        : close !== -1
                            ? close
                            : text.length;
                    const valueEnd = close === -1 ? text.length : close;
                    const baseText = text.slice(argumentStart, baseEnd);
                    const valueText = comma === -1
                        ? ""
                        : text.slice(comma + 1, valueEnd);
                    const logarithm = document.createElement("span");
                    const base = document.createElement("sub");
                    logarithm.className = "custom-log-expression";
                    logarithm.append(document.createTextNode("log"));
                    renderPart(baseText || "a", base);
                    logarithm.append(base, document.createTextNode("("));

                    if (comma !== -1 && valueText) {
                        renderPart(valueText, logarithm);
                    } else {
                        const targetButton = document.createElement("button");
                        targetButton.type = "button";
                        targetButton.className = "function-argument-target";
                        targetButton.textContent = "□";
                        targetButton.setAttribute(
                            "aria-label",
                            "Click to enter the logarithm argument"
                        );
                        logarithm.append(targetButton);
                    }

                    logarithm.append(document.createTextNode(")"));
                    target.append(logarithm);
                    position = close === -1 ? text.length : close + 1;
                    continue;
                }

                const argumentStart = rootStart + "nthroot(".length;
                let depth = 1;
                let comma = -1;
                let close = -1;

                for (let index = argumentStart; index < text.length; index++) {
                    if (text[index] === "(") {
                        depth += 1;
                    } else if (text[index] === ")") {
                        depth -= 1;
                        if (depth === 0) {
                            close = index;
                            break;
                        }
                    } else if (text[index] === "," && depth === 1 && comma === -1) {
                        comma = index;
                    }
                }

                const indexEnd = comma !== -1
                    ? comma
                    : close !== -1
                        ? close
                        : text.length;
                const radicandEnd = close === -1 ? text.length : close;
                const indexText = text.slice(argumentStart, indexEnd);
                const radicandText = comma === -1
                    ? ""
                    : text.slice(comma + 1, radicandEnd);
                const root = document.createElement("span");
                const index = document.createElement("sup");
                root.className = "nthroot-expression";
                renderPart(indexText || "n", index);
                root.append(index, document.createTextNode("√("));

                if (comma !== -1 && radicandText) {
                    renderPart(radicandText, root);
                } else {
                    const targetButton = document.createElement("button");
                    targetButton.type = "button";
                    targetButton.className =
                        "function-argument-target nthroot-radicand-target";
                    targetButton.textContent = "□";
                    targetButton.setAttribute(
                        "aria-label",
                        "Click to enter the number under the root"
                    );
                    root.append(targetButton);
                }

                root.append(document.createTextNode(")"));
                target.append(root);
                position = close === -1 ? text.length : close + 1;
            }
        };

        target.replaceChildren();
        renderPart(source, target);
    }

    render(model) {
        const hasCustomFunction = Object.hasOwn(model.functions, "f");
        this.functionButton.setAttribute(
            "aria-label",
            hasCustomFunction
                ? "Insert a call to f"
                : "Start a definition for f"
        );
        this.functionButton.title = hasCustomFunction
            ? "Insert f( to call the saved function"
            : "Start a custom function definition";
        this.deleteFunctionButton.hidden = !hasCustomFunction;
        this.keys
            .querySelector(".keypad-toolbar")
            .classList.toggle("has-saved-function", hasCustomFunction);

        this.renderExpression(model.expression || "");
        const preview = model.previewResult();
        const isEditing = Boolean(model.expression) &&
            !model.justEvaluated &&
            !model.isError;
        const result = preview ??
            (isEditing ? "" : model.result ?? "0");
        const scientificResult = !model.isError &&
            result.match(/^(-?\d+(?:\.\d+)?)E([+-]?\d+)$/);
        let displayedScientificResult = scientificResult;

        if (this.scientificNotation && !model.isError) {
            const value = Number(result);
            if (Number.isFinite(value) && value !== 0) {
                const [rawMantissa, rawExponent] = value
                    .toExponential(11)
                    .split("e");
                const mantissa = rawMantissa.replace(
                    /(\.\d*?[1-9])0+$|\.0+$/,
                    "$1"
                );
                displayedScientificResult = [
                    null,
                    mantissa,
                    String(Number(rawExponent))
                ];
            }
        }

        if (displayedScientificResult) {
            const [, mantissa, exponent] = displayedScientificResult;
            const power = document.createElement("sup");
            this.result.replaceChildren(
                document.createTextNode(`${mantissa} × 10`),
                power
            );
            power.textContent = exponent;
            this.result.setAttribute(
                "aria-label",
                `${mantissa} times 10 to the power of ${exponent}`
            );
        } else {
            this.result.textContent = model.isError
                ? result
                : result.replace(/^(-?\d+)(?=\.|$)/, (integer) =>
                integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            );
            this.result.removeAttribute("aria-label");
        }

        this.result.classList.toggle(
            "result--error",
            Boolean(model.isError)
        );
        this.result.classList.toggle("result--preview", isEditing);
        if (preview !== null) {
            this.result.setAttribute("aria-label", `Preview result: ${result}`);
        }

        this.status.textContent = model.angle;
        this.status.setAttribute(
            "aria-label",
            `Angle unit: ${model.angle}. Activate to switch`
        );
        this.memoryIndicator.textContent =
            model.memory !== null && model.memory !== undefined ? "M" : "";
        this.buttons
            .filter((button) => button.dataset.label === "MC")
            .forEach((button) => {
                button.disabled = model.memory === null || model.memory === undefined;
                button.classList.toggle("has-memory", !button.disabled);
            });

    }
}

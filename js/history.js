class CalculatorHistory {
    constructor(model, calculator, view) {
        this.model = model;
        this.calculator = calculator;
        this.view = view;
        this.handle = calculator.querySelector(".history-handle");
        this.screen = calculator.querySelector("#history-screen");
        this.display = calculator.querySelector(".display");
        this.keys = calculator.querySelector("#keys");
        this.clearButton = this.screen.querySelector(".history-clear");
        this.emptyMessage = this.screen.querySelector(".history-empty");
        this.list = this.screen.querySelector(".history-list");
        this.drag = null;
        this.animation = null;
        this.isOpen = false;
        this.ignoreNextHandleClick = false;
        this.origin = { x: 0, y: 0 };
        this.maxRadius = 0;
        this.currentRadius = 0;

        if (!this.handle || !this.display || !this.keys || !this.clearButton ||
            !this.emptyMessage || !this.list) {
            throw new Error("The calculator history interface is incomplete.");
        }

        this.handle.addEventListener("pointerdown", (event) => {
            this.startDrag(event);
        });
        this.handle.addEventListener("pointermove", (event) => {
            this.moveDrag(event);
        });
        this.handle.addEventListener("pointerup", (event) => {
            this.finishDrag(event);
        });
        this.handle.addEventListener("pointercancel", () => {
            this.cancelDrag();
        });
        this.handle.addEventListener("click", (event) => {
            if (this.ignoreNextHandleClick && event.detail > 0) {
                this.ignoreNextHandleClick = false;
                return;
            }
            this.ignoreNextHandleClick = false;

            if (this.isOpen) {
                this.close();
            } else if (event.detail === 0) {
                this.open(this.getHandleOrigin(), true);
            }
        });
        this.clearButton.addEventListener("click", () => {
            if (window.confirm("Clear all calculation history?")) {
                this.model.clearHistory();
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isOpen) {
                this.close();
            }
        });
        this.model.onChange(() => this.render());
        this.render();
    }

    render() {
        const entries = this.model.history.map((entry) => {
            const button = document.createElement("button");
            const calculation = document.createElement("span");
            const expression = document.createElement("span");
            const equals = document.createElement("span");
            const result = document.createElement("span");
            const timestamp = document.createElement("time");

            button.type = "button";
            button.className = "history-entry";
            calculation.className = "history-calculation";
            button.setAttribute("role", "listitem");
            expression.className = "history-expression";
            this.view.renderExpression(entry.expression, expression);
            button.setAttribute(
                "aria-label",
                `${expression.textContent} equals ${entry.result}`
            );
            equals.className = "history-equals";
            equals.setAttribute("aria-hidden", "true");
            equals.textContent = "=";
            result.className = "history-result";
            result.textContent = entry.result.replace(
                /^(-?\d+)(?=\.|$)/,
                (integer) =>
                    integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            );
            timestamp.className = "history-time";
            timestamp.dateTime = new Date(entry.timestamp).toISOString();
            timestamp.textContent = new Date(entry.timestamp).toLocaleString();
            calculation.append(expression, equals, result);
            button.append(calculation, timestamp);
            button.addEventListener("click", () => {
                if (this.model.reuseHistoryEntry(entry)) {
                    this.close();
                }
            });

            return button;
        });

        this.list.replaceChildren(...entries);
        this.emptyMessage.hidden = entries.length > 0;
        this.clearButton.disabled = entries.length === 0;
    }

    getHandleOrigin() {
        const bounds = this.handle.getBoundingClientRect();
        const screenBounds = this.screen.getBoundingClientRect();
        return {
            x: bounds.left + bounds.width / 2 - screenBounds.left,
            y: bounds.top + bounds.height / 2 - screenBounds.top
        };
    }

    getMaxRadius(origin) {
        const bounds = this.screen.getBoundingClientRect();
        const width = bounds.width;
        const height = bounds.height;
        return Math.ceil(Math.max(
            Math.hypot(origin.x, origin.y),
            Math.hypot(width - origin.x, origin.y),
            Math.hypot(origin.x, height - origin.y),
            Math.hypot(width - origin.x, height - origin.y)
        )) + 2;
    }

    setClip(radius) {
        this.currentRadius = radius;
        this.screen.style.clipPath =
            `circle(${radius}px at ${this.origin.x}px ${this.origin.y}px)`;
    }

    showScreen() {
        this.screen.classList.add("is-visible");
        this.screen.setAttribute("aria-hidden", "false");
        this.screen.inert = true;
        this.handle.querySelector("span").textContent = "›";
        this.handle.setAttribute(
            "aria-label",
            "Return to calculator"
        );
        this.handle.title = "Return to calculator";
        this.screen.style.setProperty("--reveal-progress", "0");
        this.screen.style.setProperty("--wave-x", `${this.origin.x}px`);
        this.screen.style.setProperty("--wave-y", `${this.origin.y}px`);
    }

    startDrag(event) {
        if (!event.isPrimary ||
            (event.pointerType === "mouse" && event.button !== 0)) {
            return;
        }

        this.animation?.cancel();
        this.animation = null;
        this.origin = this.getHandleOrigin();
        this.maxRadius = this.getMaxRadius(this.origin);
        this.currentRadius = this.isOpen ? this.maxRadius : 12;
        const openDirection = 1;
        this.drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            distance: 0,
            openDirection
        };
        this.handle.setPointerCapture(event.pointerId);
        this.handle.classList.add("is-dragging");
        this.handle.style.transform = "translateX(0)";
    }

    moveDrag(event) {
        if (!this.drag || event.pointerId !== this.drag.pointerId) {
            return;
        }

        const distance = Math.max(
            0,
            (event.clientX - this.drag.startX) * this.drag.openDirection
        );
        this.drag.distance = distance;

        if (distance < 8) {
            return;
        }

        if (!this.isOpen && !this.screen.classList.contains("is-visible")) {
            this.showScreen();
            this.currentRadius = 12;
            this.setClip(this.currentRadius);
        }

        const progress = Math.min(
            distance / (this.screen.clientWidth * 0.65),
            1
        );
        const radius = this.isOpen
            ? this.maxRadius - (this.maxRadius - 12) * progress
            : 12 + (this.maxRadius - 12) * progress;
        this.setClip(radius);
        this.screen.style.setProperty(
            "--reveal-progress",
            String(Math.min(progress * 2.5, 1))
        );
        this.handle.style.transform =
            `translateX(${Math.min(distance * this.drag.openDirection * 0.35, 18)}px)`;
    }

    finishDrag(event) {
        if (!this.drag || event.pointerId !== this.drag.pointerId) {
            return;
        }

        const distance = Math.max(
            this.drag.distance,
            (event.clientX - this.drag.startX) * this.drag.openDirection
        );
        const wasOpen = this.isOpen;
        this.drag = null;
        this.ignoreNextHandleClick = true;
        this.resetHandle();

        if (distance >= this.getDragThreshold()) {
            if (wasOpen) {
                this.close(false, this.currentRadius);
            } else {
                this.open(this.origin, false, this.currentRadius);
            }
        } else if (this.screen.classList.contains("is-visible")) {
            if (wasOpen) {
                this.open(this.origin, false, this.currentRadius);
            } else {
                this.close(false);
            }
        }
    }

    cancelDrag() {
        if (!this.drag) {
            return;
        }

        this.drag = null;
        if (this.screen.classList.contains("is-visible")) {
            this.close(false);
        } else {
            this.resetHandle();
        }
    }

    getDragThreshold() {
        return Math.max(84, Math.min(128, window.innerWidth * 0.24));
    }

    open(origin, focusOnOpen = false, startRadius = 12) {
        this.animation?.cancel();
        this.animation = null;
        this.origin = origin;
        this.maxRadius = this.getMaxRadius(origin);
        this.isOpen = true;
        this.showScreen();
        this.screen.inert = false;
        this.display.inert = true;
        this.keys.inert = true;
        this.screen.style.setProperty("--reveal-progress", "1");
        this.setClip(startRadius);
        this.resetHandle();

        const finishOpening = () => {
            this.animation = null;
            this.screen.style.clipPath = "none";
            if (focusOnOpen || document.activeElement === this.display) {
                this.handle.focus();
            }
        };

        if (this.prefersReducedMotion() || !this.screen.animate) {
            finishOpening();
            return;
        }

        const animation = this.screen.animate(
            [
                { clipPath: this.screen.style.clipPath },
                {
                    clipPath:
                        `circle(${this.maxRadius}px at ` +
                        `${origin.x}px ${origin.y}px)`
                }
            ],
            {
                duration: 620,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                fill: "forwards"
            }
        );
        this.animation = animation;
        animation.onfinish = () => {
            if (this.animation === animation) {
                animation.cancel();
                finishOpening();
            }
        };
    }

    close(restoreFocus = true, startRadius = null) {
        if (!this.screen.classList.contains("is-visible")) {
            this.isOpen = false;
            this.resetHandle();
            return;
        }

        this.animation?.cancel();
        this.animation = null;
        const wasOpen = this.isOpen;
        const visibleClip = getComputedStyle(this.screen).clipPath.match(
            /circle\(\s*([\d.]+)px/
        );
        const clipRadius = startRadius ?? (wasOpen
            ? Number(visibleClip?.[1] ?? this.maxRadius)
            : this.currentRadius);
        this.isOpen = false;
        this.screen.inert = true;

        const finishClosing = () => {
            this.screen.classList.remove("is-visible");
            this.screen.setAttribute("aria-hidden", "true");
            this.screen.style.clipPath = "";
            this.screen.style.removeProperty("--reveal-progress");
            this.screen.style.removeProperty("--wave-x");
            this.screen.style.removeProperty("--wave-y");
            this.display.inert = false;
            this.keys.inert = false;
            this.handle.querySelector("span").textContent = "‹";
            this.handle.setAttribute(
                "aria-label",
                "Drag right to reveal calculation history; activate to open"
            );
            this.handle.title = "Drag right to reveal history, or press Enter to open";
            this.resetHandle();
            if (restoreFocus) {
                this.handle.focus();
            }
        };

        if (this.prefersReducedMotion() || !this.screen.animate) {
            finishClosing();
            return;
        }

        const endingClip =
            `circle(0px at ${this.origin.x}px ${this.origin.y}px)`;
        const animation = this.screen.animate(
            [
                {
                    clipPath:
                        `circle(${clipRadius}px at ` +
                        `${this.origin.x}px ${this.origin.y}px)`
                },
                { clipPath: endingClip }
            ],
            {
                duration: wasOpen ? 400 : 190,
                easing: "cubic-bezier(0.4, 0, 1, 1)",
                fill: "forwards"
            }
        );
        this.animation = animation;
        animation.onfinish = () => {
            if (this.animation === animation) {
                animation.cancel();
                finishClosing();
            }
        };
    }

    resetHandle() {
        this.handle.classList.remove("is-dragging");
        this.handle.style.transform = "";
    }

    prefersReducedMotion() {
        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }
}

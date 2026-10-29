/* Light and dark appearance toggle. */

(() => {
    const storageKey = "calculator.theme.v1";
    const root = document.documentElement;
    const toggle = document.querySelector("#theme-toggle");

    if (!toggle) {
        throw new Error("The calculator theme toggle is missing.");
    }

    function readTheme() {
        try {
            return window.localStorage.getItem(storageKey) === "dark"
                ? "dark"
                : "light";
        } catch (error) {
            console.error("Unable to read the calculator theme preference.", error);
            return "light";
        }
    }

    function applyTheme(theme, persist = false) {
        const isDark = theme === "dark";
        root.dataset.theme = isDark ? "dark" : "light";
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.setAttribute(
            "aria-label",
            `Switch to ${isDark ? "light" : "dark"} mode`
        );
        toggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;

        if (persist) {
            try {
                window.localStorage.setItem(storageKey, isDark ? "dark" : "light");
            } catch (error) {
                console.error("Unable to save the calculator theme preference.", error);
            }
        }

        document.dispatchEvent(new CustomEvent("calculator-theme-change", {
            detail: { theme: isDark ? "dark" : "light" }
        }));
    }

    function clearTransitionOrigin() {
        root.style.removeProperty("--theme-transition-x");
        root.style.removeProperty("--theme-transition-y");
    }

    function transitionTheme(theme) {
        if (typeof document.startViewTransition !== "function") {
            root.classList.add("theme-transition-fallback");
            applyTheme(theme, true);
            window.setTimeout(() => {
                root.classList.remove("theme-transition-fallback");
            }, 700);
            return;
        }

        const bounds = toggle.getBoundingClientRect();
        root.style.setProperty(
            "--theme-transition-x",
            `${bounds.left + bounds.width / 2}px`
        );
        root.style.setProperty(
            "--theme-transition-y",
            `${bounds.top + bounds.height / 2}px`
        );

        try {
            const transition = document.startViewTransition(() => {
                applyTheme(theme, true);
            });
            transition.finished.then(
                clearTransitionOrigin,
                (error) => {
                    clearTransitionOrigin();
                    console.error("The calculator theme transition failed.", error);
                }
            );
        } catch (error) {
            clearTransitionOrigin();
            console.error("Unable to start the calculator theme transition.", error);
            applyTheme(theme, true);
        }
    }

    applyTheme(readTheme());
    toggle.addEventListener("click", () => {
        transitionTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
})();

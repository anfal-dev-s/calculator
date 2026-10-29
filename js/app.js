
/* ربط أجزاء الآلة الحاسبة والإضافات */

document.addEventListener("DOMContentLoaded", () => {
    const model = new CalculatorModel();
    model.angle = "RAD";

    const view = new CalculatorView(
        document.querySelector(".calculator"),
        KEYS
    );

    const controller = new CalculatorController(
        model,
        view
    );

    new UnitConverter(document.querySelector("#converter-panel"));

    for (const extension of window.calculatorExtensions || []) {
        extension.install({
            model,
            view,
            controller
        });
    }

    new CalculatorHistory(model, view.root, view);
    view.render(model);
});

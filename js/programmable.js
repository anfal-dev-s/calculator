
/* Part 2: programmable calculator */

window.extend({
    install({ model, controller }) {
        const DEFINITION = /^([a-z])\(([a-z])\)=(.+)$/;
        const DEFINITION_START = /^([a-z])\(([a-z])\)=/;

        function showError(error) {
            model.result = String(error);
            model.status = "";
            model.isError = true;
            model.justEvaluated = false;
            model.notify();
        }

        function calculateOrStoreDefinition() {
            const source = model.expression.replace(/\s+/g, "");
            const start = source.match(DEFINITION_START);

            if (!start) {
                model.calculate();
                return;
            }

            const match = source.match(DEFINITION);

            if (!match) {
                showError("Write a definition like f(x)=x^2+1");
                return;
            }

            const [, name, parameter, body] = match;

            if (
                Object.hasOwn(Engine.CONSTANTS, name) ||
                Object.hasOwn(Engine.FUNCTIONS, name) ||
                Object.hasOwn(model.functions, name)
            ) {
                showError(`The name '${name}' is already in use`);
                return;
            }

            try {
                Engine.check(body, parameter, model.functions);
            } catch (error) {
                showError(String(error));
                return;
            }

            model.functions[name] = [parameter, body];
            model.pieces = [];
            model.expression = "";
            model.result = `Stored ${name}(${parameter})`;
            model.status = "";
            model.isError = false;
            model.justEvaluated = true;
            model.notify();
        }

        controller.addCommand("=", calculateOrStoreDefinition);
    }
});

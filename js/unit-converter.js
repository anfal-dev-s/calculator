/* Unit conversion data and live conversion panel. */

const CONVERSION_CATEGORIES = {
    length: {
        label: "Length",
        defaultFrom: "m",
        defaultTo: "km",
        units: [
            ["mm", "Millimeter (mm)", 0.001],
            ["cm", "Centimeter (cm)", 0.01],
            ["m", "Meter (m)", 1],
            ["km", "Kilometer (km)", 1000],
            ["in", "Inch (in)", 0.0254],
            ["ft", "Foot (ft)", 0.3048],
            ["yd", "Yard (yd)", 0.9144],
            ["mi", "Mile (mi)", 1609.344]
        ]
    },
    mass: {
        label: "Mass",
        defaultFrom: "kg",
        defaultTo: "g",
        units: [
            ["mg", "Milligram (mg)", 0.000001],
            ["g", "Gram (g)", 0.001],
            ["kg", "Kilogram (kg)", 1],
            ["t", "Metric ton (t)", 1000],
            ["oz", "Ounce (oz)", 0.028349523125],
            ["lb", "Pound (lb)", 0.45359237]
        ]
    },
    temperature: {
        label: "Temperature",
        defaultFrom: "c",
        defaultTo: "f",
        units: [
            ["c", "Celsius (°C)"],
            ["f", "Fahrenheit (°F)"],
            ["k", "Kelvin (K)"]
        ]
    },
    volume: {
        label: "Volume",
        defaultFrom: "l",
        defaultTo: "ml",
        units: [
            ["ml", "Milliliter (mL)", 0.001],
            ["l", "Liter (L)", 1],
            ["m3", "Cubic meter (m³)", 1000],
            ["tsp", "US teaspoon (tsp)", 0.00492892159375],
            ["tbsp", "US tablespoon (tbsp)", 0.01478676478125],
            ["cup", "US cup", 0.2365882365],
            ["gal", "US gallon (gal)", 3.785411784]
        ]
    },
    area: {
        label: "Area",
        defaultFrom: "m2",
        defaultTo: "ft2",
        units: [
            ["cm2", "Square centimeter (cm²)", 0.0001],
            ["m2", "Square meter (m²)", 1],
            ["km2", "Square kilometer (km²)", 1000000],
            ["ha", "Hectare (ha)", 10000],
            ["acre", "Acre", 4046.8564224],
            ["ft2", "Square foot (ft²)", 0.09290304]
        ]
    },
    speed: {
        label: "Speed",
        defaultFrom: "kph",
        defaultTo: "mph",
        units: [
            ["mps", "Meters per second (m/s)", 1],
            ["kph", "Kilometers per hour (km/h)", 1 / 3.6],
            ["mph", "Miles per hour (mph)", 0.44704],
            ["knot", "Knot (kn)", 0.514444444444]
        ]
    },
    time: {
        label: "Time",
        defaultFrom: "h",
        defaultTo: "min",
        units: [
            ["ms", "Millisecond (ms)", 0.001],
            ["s", "Second (s)", 1],
            ["min", "Minute (min)", 60],
            ["h", "Hour (h)", 3600],
            ["day", "Day", 86400],
            ["week", "Week", 604800]
        ]
    }
};

class UnitConverter {
    constructor(panel) {
        if (!panel) {
            throw new Error("The unit conversion panel is missing.");
        }

        this.panel = panel;
        this.category = panel.querySelector("#conversion-category");
        this.value = panel.querySelector("#conversion-value");
        this.from = panel.querySelector("#conversion-from");
        this.to = panel.querySelector("#conversion-to");
        this.result = panel.querySelector("#conversion-result");
        this.swap = panel.querySelector("#conversion-swap");

        if (
            !this.category ||
            !this.value ||
            !this.from ||
            !this.to ||
            !this.result ||
            !this.swap
        ) {
            throw new Error("The unit conversion controls are incomplete.");
        }

        for (const [key, category] of Object.entries(CONVERSION_CATEGORIES)) {
            this.category.add(new Option(category.label, key));
        }

        this.category.addEventListener("change", () => {
            this.populateUnits();
            this.render();
        });
        this.value.addEventListener("input", () => this.render());
        this.from.addEventListener("change", () => this.render());
        this.to.addEventListener("change", () => this.render());
        this.swap.addEventListener("click", () => {
            const value = this.value.valueAsNumber;
            const converted = Number.isFinite(value)
                ? UnitConverter.convert(
                    value,
                    this.category.value,
                    this.from.value,
                    this.to.value
                )
                : null;
            [this.from.value, this.to.value] = [
                this.to.value,
                this.from.value
            ];
            if (converted !== null) {
                this.value.value = String(converted);
            }
            this.render();
        });

        this.populateUnits();
        this.render();
    }

    static convert(value, categoryKey, fromId, toId) {
        if (!Number.isFinite(value)) {
            throw new RangeError("Enter a finite value to convert.");
        }

        const category = CONVERSION_CATEGORIES[categoryKey];
        if (!category) {
            throw new RangeError(`Unknown conversion category '${categoryKey}'.`);
        }

        const from = category.units.find(([id]) => id === fromId);
        const to = category.units.find(([id]) => id === toId);
        if (!from || !to) {
            throw new RangeError("Select valid units for conversion.");
        }

        if (categoryKey !== "temperature") {
            return (value * from[2]) / to[2];
        }

        const celsius = fromId === "f"
            ? (value - 32) * 5 / 9
            : fromId === "k"
                ? value - 273.15
                : value;
        return toId === "f"
            ? celsius * 9 / 5 + 32
            : toId === "k"
                ? celsius + 273.15
                : celsius;
    }

    populateUnits() {
        const category = CONVERSION_CATEGORIES[this.category.value];
        const units = category.units;
        for (const select of [this.from, this.to]) {
            select.replaceChildren(
                ...units.map(([id, label]) => new Option(label, id))
            );
        }

        this.from.value = category.defaultFrom;
        this.to.value = category.defaultTo;
    }

    render() {
        const value = this.value.valueAsNumber;
        if (!Number.isFinite(value)) {
            this.result.textContent = "—";
            return;
        }

        const converted = UnitConverter.convert(
            value,
            this.category.value,
            this.from.value,
            this.to.value
        );
        this.result.textContent = Object.is(converted, -0)
            ? "0"
            : new Intl.NumberFormat(undefined, {
                maximumSignificantDigits: 12
            }).format(converted);
    }
}

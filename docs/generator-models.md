# Adding a generator model / Añadir un modelo de generador

The DG822 adapter supplies its photograph, window, element mapping and English LCD conventions. Reuse the following modules when adding a model:

- `app/generator.js`: parameter metadata, display-unit conversions, validation, waveform-dependent AC RMS conversion, waveform changes preserving the programmed amplitude and independent output toggles. It has no DOM or model names.
- `app/generator-controller.js`: actions against the current shared generator settings: `parameter(name, value, unit)`, `waveform(name)` and `output(channel)`. `reading(name)` supplies the value/unit pair for any display, including the main summary.
- `app/generator-panel.js`: numeric editor, unit options, validation feedback, Apply/Cancel/close focus, waveform menu transitions, output key state and reading refresh. It receives actual elements and presentation functions, not model-specific IDs.
- `app/instrument-window.js`: the existing shared movable instrument window.

Follow `app/dg822-panel.js`: pass a controller, element map and presentation profile to `createGeneratorPanel`. The profile defines reading text, accessibility labels, editor title, phase text, RMS explanation, preview SVG path and channel/output labels. The DG822 keeps its grouped fractional digits, fixed phase and untranslated English screen here; another model can choose its own display format and labels. Its HTML/CSS define the carátula and menu layout. Both active waveform choices remain Sine and Square; the other six DG822 tiles remain disabled.

A different menu/editor arrangement can call the same controller actions from a custom adapter. Keep unit conversion and electrical effects in the shared generator module. Never store an adapter's element ID in parameter metadata or retain a private copy of experiment settings. Display-unit choices currently belong to the shared generator state. A waveform preview is presentation; RC voltages continue to come from the circuit model, with only CH1 connected and CH2 independent/disconnected in the RC practice.

Practice defaults and AUTO restoration remain in the existing practice lifecycle. After replacing experiment settings, reset the panel menu and render; controllers read the new state through their callbacks. Closing/reopening preserves generator settings and returns the DG822 to its parameter screen. The numeric editor and waveform menu keep their existing English text. No second production model or model selector is added by this refactor.

`tests/generator-panel.test.cjs` exercises two panels with one controller and different reading/editor presentations, including units, RMS, menu transitions, invalid/cancelled edits, focus, outputs, reset and repeated rendering. `tests/dg822.test.cjs` checks the original conversions, numeric format and RC effects. `tests/practice-defaults.test.cjs` checks restoration for different active practices.

## Resumen en español

Cada modelo aporta su carátula, los elementos de control y las convenciones de pantalla. Las unidades, conversiones RMS, validación, selección de onda, salidas y edición común se reutilizan. El DG822 conserva sus formatos y su pantalla en inglés. Otro modelo puede organizar sus menús de otra manera y llamar a las mismas acciones sin duplicar su funcionamiento.

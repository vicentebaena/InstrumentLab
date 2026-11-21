# Adding an oscilloscope model / Añadir un modelo de osciloscopio

The DS1102E is the first adapter. New models reuse the existing oscilloscope state, commands and signal renderer. They do not need copies of scale, visibility, selection, position or practice-reset logic.

## Shared layers

- `app/oscilloscope.js`: instrument state transitions and SVG signal rendering. It has no model names or faceplate DOM IDs.
- `app/oscilloscope-controller.js`: actions against the current shared state and experiment. Both the main preview and instrument screens read through this controller.
- `app/instrument-controls.js`: rotary dragging, wheel accumulation, keyboard directions and pointer cancellation. It holds gesture state only.
- `app/oscilloscope-panel.js`: common front-panel wiring and projection of channel visibility, selection, sliders and channel-menu state onto supplied elements.
- `app/instrument-window.js`: opening, closing, dragging, focus and foreground ordering, also used by the generator.
- `app/circuits.js`: each practice's `instrumentDefaults`; AUTO delegates to the application's existing practice restoration.

## Model adapter

Follow `app/ds1102e-panel.js`: supply the photograph, window configuration, actual DOM elements and display geometry to `createOscilloscopePanel`. The model's HTML/CSS define the button locations and menu layout. The common panel receives elements, not a model name or naming convention.

Display options are `idPrefix` (unique per simultaneous screen), `horizontalDivisions`, `cellWidth` in SVG units and `footerScales`. DS1102E uses twelve divisions, 40-unit cells and the lower CH1/CH2/Time row. The main preview keeps ten divisions and the upper timebase readout. Changing an ID prefix cannot change signal geometry.

The common panel supports the present channel/menu keys, AUTO and three rotary controls. A model with another menu layout can provide its own presentation adapter and call `controller.actions.channel`, `menu`, `scale`, `timeScale`, `position` and `auto`; the state transitions remain shared. New menu behaviour should first become an explicit common state/action if it affects signals. Coupling is implemented through the shared selection registry; Probe uses the same registry and confirmation flow; bandwidth remains display-only.

Create one controller for the experiment, then pass it to the desired model adapter. Its `getSettings()` always reads the current state, including after a practice reset; adapters must not keep private copies of electrical settings. Rendering a panel must not bind new listeners or mutate instrument settings. Add the new adapter's script before `main.js`, and connect the chosen instrument's open action when model selection is implemented. No model selector or second production model has been added in this refactor.

## Verification

`tests/oscilloscope-panel.test.cjs` exercises two panels with arbitrary model IDs and different geometries sharing one controller. It checks channel menus, visibility, scale directions, position, rotary/wheel input, AUTO and translation. Existing model and practice-default tests cover circuit physics, signal formatting, independent channels, ground-marker priority and restoration.

## Resumen en español

Un modelo nuevo aporta su carátula, los elementos de control, su disposición y la geometría de pantalla. Reutiliza el controlador, las acciones, el estado y el dibujo de señales. Los gestos de los mandos y la presentación común de menús están separados del DS1102E. Si otro equipo organiza los menús de otra forma, su adaptador puede llamar directamente a las mismas acciones sin copiar su funcionamiento. Los valores iniciales siguen perteneciendo a la práctica activa.

Model adapters supply `submenuViews`, keyed by registry name. Each view maps its button, submenu element, main-menu value element, option elements, translation key and value formatter. The common panel handles opening, highlighting, confirmation projection and the shared `selectionKnob` / `submenuIndicator`. There are no Coupling-specific DOM bindings in that layer.

## Reusable rotary submenu selection

`oscilloscope.submenus` registers each submenu’s channel property and allowed options. `openSubmenu`, `stepSubmenu` and `confirmSubmenu` manage the pending selection independently of committed channel state. Menu closure and channel switching discard the pending value. The controller exposes `submenu(name)`, `submenuStep(direction)` and `submenuConfirm()`. The optional `selectionKnob` uses the shared rotary binding with confirmation-on-press; drag-generated clicks are suppressed to prevent accidental confirmation. Clockwise/down/right advances, counterclockwise/up/left goes back, and the wheel works too. Enter/Space confirms. The DS1102E maps the beige multifunction knob to this element.

The Coupling registry stores DC/AC/GND. The renderer applies it per channel, including dense-frequency ranges: DC preserves voltage, AC subtracts the circuit’s full-period mean, GND plots a horizontal line at the movable ground reference. `circuit.mean(parameters, generator)` supplies analytical input/output means for RC; other models can supply their own or use full-period numerical sampling. This ideal mean removal is the requested behaviour, with no physical high-pass transient emulation.

The Probe registry has numeric options 1, 5, 10, 20, 50, 100, 200, 500 and 1000. The renderer multiplies the post-coupling displayed voltage by `channel.probe`, preserving the movable zero reference and the other channel. Dense range rendering follows the same transformation. GND remains zero. The DS1102E uses one common `.ds1102e-submenu` origin for all popup menus; Probe has compact 20px rows so all nine choices fit above the footer at the minimum faceplate size.

The common controller also exposes `horizontalPosition(direction)`. An optional `horizontalPosition` element in the panel map binds this global rotary control. State stores `horizontalPositionDivisions`, default 0, with 0.1-division steps in ±12 divisions. Positive values shift both displayed signals right, independent of channel selection/visibility. Reset/AUTO uses the practice defaults. Model adapters position this control without adding another state implementation. Rotary overlays use the original knob photograph without additional radial marks.

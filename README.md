# InstrumentLab

A virtual electronics bench for practising instrument controls across different courses. / Un laboratorio virtual de electrónica para practicar el manejo de instrumentos en distintas asignaturas.

- Application / Aplicación: https://vicentebaena.github.io/InstrumentLab/
- Repository / Repositorio: https://github.com/vicentebaena/InstrumentLab
- Author / Autor: Vicente Baena Lecuyer · Universidad de Sevilla.

## Use / Uso

Open `index.html` in a browser, or use the published app. No installation, server, external dependencies or network connection is required for local use. Switch between English and Spanish without resetting the circuit; the language choice is remembered locally.

Abrir `index.html` en un navegador o acceder a la aplicación publicada. El uso local no necesita instalación, servidor, dependencias externas ni conexión. El selector cambia entre español e inglés sin reiniciar el circuito y recuerda el idioma elegido.

## RC practice / Práctica RC

- Fixed RC low-pass circuit: generator at the input, CH1 at the input and CH2 across the capacitor. Both probe ground clips connect to the common circuit return.
- Defaults: R = 1 kΩ, C = 100 nF. Click either value in the schematic to edit it in a modal dialog. Apply updates the diagram, characteristics and waveforms; Cancel/Escape preserves the previous value.
- Generator: square wave, 1 kHz, 2 Vpp, 0 V DC offset and 50% duty cycle.
- Scope screen: yellow CH1/input and blue CH2/capacitor, with adjustable shared timebase and independent vertical scales (defaults 200 µs/div, 0.5 V/div). Component changes do not rescale the display.
- Restore defaults resets circuit and generator settings while retaining the language.

Circuito RC paso bajo con conexiones fijas. Los valores se editan pulsando R o C en el esquema. La pantalla muestra la entrada en amarillo y la tensión del condensador en azul. Las escalas permanecen fijas al cambiar los componentes.

## Model and limits / Modelo y límites

The RC response is the exact periodic steady state of an ideal RC circuit driven by a symmetrical square wave or sine wave. It is not a startup transient. Generator output impedance, probe loading, sampling, hardware bandwidth and trigger imperfections are not modelled.

La respuesta corresponde al régimen periódico permanente de un RC ideal ante una onda cuadrada simétrica o una senoide. No representa el arranque. No se modelan la impedancia del generador, la carga de las sondas, el muestreo, el ancho de banda del equipo ni las imperfecciones del disparo.

Click the generator image to open the Rigol DG822 window. The movable window uses the high-resolution DG822 cutout as a faceplate, with a live display of the current frequency, amplitude and DC offset; Phase stays at zero. The instrument screen is always in English and uses DG822 fractional-digit grouping (e.g. `1.000,000,000 kHz`, `2.000,0 Vpp`, `0.000,0 Vdc`, `0.000º`), independent of the application language. Closing it preserves settings. Click Freq, Ampl or Offset to edit the reading and its units; Apply commits and Cancel/Escape preserves the prior settings. Phase remains fixed at zero. Further circuits are planned.

Al pulsar la imagen del generador se abre la ventana específica del Rigol DG822. Se puede mover y cerrar; su pantalla permanece en inglés y muestra la frecuencia, la amplitud en Vpp, el offset en Vdc y Phase fijo a cero, con el formato numérico del DG822 sobre la carátula de alta resolución. Freq, Ampl y Offset abren un editor de valor y unidades; Apply aplica el cambio y Cancel/Escape lo descarta. Phase sigue fijo a cero. Se añadirán nuevos circuitos más adelante.

## Development / Desarrollo

- `app/circuits.js`: circuit registry, parameters, wiring, diagram and RC response.
- `app/oscilloscope.js`: signal display with fixed scales.
- `app/main.js`: interface and component editing.
- `app/dg822-panel.js` and `app/dg822-panel.css`: Rigol DG822-specific window and display.
- `app/ds1102e-panel.js` and `app/ds1102e-panel.css`: Rigol DS1102E faceplate and synchronised scope screen.
- `app/instrument-window.js`: shared window opening, closing, dragging and foreground order.
- `app/translations.js`: English and Spanish text.
- `assets/instruments/images.js`: background-removed instrument thumbnails embedded for offline use. These are static illustrations, not live equipment displays.
- `tests/rc-model.test.cjs`: RC response and display checks; run `node tests/rc-model.test.cjs`.

Original reference photos, manuals and local agent instructions are excluded from this repository. Only the derived thumbnails needed by the application are included.

Las fotos originales de referencia, los manuales y las instrucciones locales quedan fuera del repositorio. Se incluyen únicamente las miniaturas derivadas que necesita la aplicación.

## License / Licencia

Software: MIT. Educational text, diagrams, visualisations and teaching content: CC BY 4.0, with attribution to Vicente Baena. See [LICENSE.md](LICENSE.md).

Código: MIT. Textos, diagramas, visualizaciones y contenido docente: CC BY 4.0, con atribución a Vicente Baena. Véase [LICENSE.md](LICENSE.md).

## DG822 units / Unidades del DG822

- Freq: MHz, kHz, Hz, mHz, uHz. Values are stored internally in Hz.
- Ampl: Vpp, mVpp, Vrms, mVrms. For a symmetrical square wave, Vpp = 2 × Vrms; for a sine wave, Vpp = 2 × √2 × Vrms. The DC offset is excluded. The model stores Vpp.
- Offset: Vdc, mVdc; the model stores volts. Negative and zero offsets are supported.
- The chosen units remain selected after applying or reopening the editor. Changing a unit selects how the typed number is interpreted; no change is applied until Apply.
- Scope scales remain fixed. When cycles cannot be resolved at the current timebase, the display shows input/output ranges and a notice instead of a false aliased curve.

Las unidades seleccionadas se conservan al aplicar y volver a abrir el editor. El offset se trata por separado de la amplitud eficaz de la componente alterna. Los cambios de frecuencia no reajustan las escalas del osciloscopio.

Unit and rendering checks: `node tests/dg822.test.cjs`.

## Waveform menu / Menú de ondas

Click the physical Menu key on the DG822 faceplate to open the touchscreen waveform selector. Sine and Square are implemented. Ramp, Pulse, Noise, Dualtone, Harm and Arb are shown disabled. Selecting Sine or Square returns automatically to the parameter display and updates the preview, channel label, main summary and RC response. The instrument screen stays in English.

Al pulsar Menu en la carátula se abre el selector táctil. Sine y Square están disponibles; las otras seis ondas aparecen desactivadas. La selección devuelve a la pantalla de parámetros y actualiza el dibujo y las señales, sin cambiar las escalas del osciloscopio. La amplitud programada se conserva en la unidad elegida, incluida Vrms; su conversión a Vpp depende de la forma de onda.

## Output switches / Salidas

Output1 and Output2 on the DG822 faceplate toggle independently and both illuminate yellow when enabled. Defaults: Output1 ON, Output2 OFF. Only CH1 is connected to the RC. Disabling Output1 removes both AC signal and DC offset; the steady-state circuit display becomes 0 V. Capacitor discharge transients are not modelled. Output2 has no effect on the RC. Programmed parameters persist while an output is disabled and when the window closes. Restore defaults also resets the output states. The main summary identifies the used channel (CH1) and its output state.

Output1 y Output2 se activan de forma independiente. Solo CH1 está conectado al RC. Al desactivar Output1 se retiran la señal y el offset; el modelo en régimen permanente muestra 0 V, sin simular el transitorio de descarga. Los parámetros programados se conservan. El resumen indica Canal utilizado: CH1 y el estado de su salida.

## Rigol DS1102E window / Ventana del osciloscopio

Click the oscilloscope image in the schematic to open its Rigol DS1102E faceplate. The screen uses the same model and settings as the main-page scope, with geometry adapted to the DS1102E LCD. Both views update together for component changes, generator settings, waveform, output enable and reset. Their SVG IDs are distinct so clipping and accessibility labels work when both displays are present.

Generator and oscilloscope windows can stay open together. Drag a title bar to move either window; click a window to bring it to the front. Close or Escape closes only that instrument window and preserves the experiment. The CH1/CH2 visibility and menu-selection keys are implemented; the other scope controls remain deferred.

Al pulsar la imagen del osciloscopio se abre su carátula Rigol DS1102E con las mismas señales, escalas y configuración que la pantalla principal. Las dos vistas se actualizan juntas. Las ventanas del generador y del osciloscopio pueden permanecer abiertas y moverse por separado. Los controles de la carátula del osciloscopio se añadirán después.

The DS1102E screen has 12 horizontal divisions; the main-page preview has 10. Both share the same adjustable timebase and signal model, centred on the same time reference. At the default 1 kHz and 200 µs/div, the instrument shows 2.4 ms / 2.4 periods and the main page 2 ms / 2 periods. The instrument SVG is wider to fill the actual faceplate screen without changing the per-division scale.

La carátula del Rigol tiene 12 divisiones horizontales; la vista principal conserva 10. Con 200 µs/div, muestran 2,4 ms y 2 ms respectivamente. Comparten la señal y la escala por división, con distinta anchura temporal total.

## Scope channels / Canales del osciloscopio

Both scope channels start visible, with both CH1/CH2 keys illuminated yellow. Press a channel key to select it and show its menu while keeping its trace visible, or restoring its trace if hidden. Press that same key again while its menu is open and selected to hide its trace and dismiss the menu. Switching to the other key selects that channel without hiding the previous one. Visibility changes apply to both the main display and instrument display. The vertical SCALE knob controls the selected visible channel independently.

Coupling now supports DC/AC/Ground through the rotary submenu. 20M bandwidth remains Disabled and Probe is selectable from 1X to 1000X; bandwidth remains display-only. Rows align to the first three right-side softkeys. The instrument's lower time readout is `Time 200.0us` by default. Restore defaults returns both channels to visible and closes the channel menu.

CH1/CH2 controlan la visibilidad de sus señales y la selección del canal. Su iluminación indica que la traza está visible. La primera pulsación muestra el menú y selecciona el canal; una segunda pulsación sobre el canal cuyo menú está abierto oculta la señal y el menú. Acoplamiento se configura con el mando de selección; Banda 20M Desactivado y Sonda se configura con el mando; Banda 20M permanece solo visual.

Channel-state checks: `node tests/oscilloscope-channels.test.cjs`.

The active oscilloscope model is Rigol DS1102E, using the corrected user-provided photograph. The earlier DS1202Z-E identification was incorrect and its faceplate has been replaced. The DS1102E uses square grid cells, twelve horizontal divisions, eight vertical divisions and the existing Time/channel scale row. Its physical CH1/CH2 keys and channel-menu rows are positioned for this faceplate. Coupling is configurable; the bandwidth option remains display-only.

El modelo activo es Rigol DS1102E. Se ha sustituido la carátula anterior y se han adaptado la pantalla, los botones CH1/CH2 y las filas del menú. Se conserva el comportamiento de canales y las doce divisiones horizontales; Acoplamiento es configurable; los otros ajustes del menú siguen siendo solo visuales.

Scope vertical scale labels follow the instrument format: 10mV, 20mV, 50mV, 100mV, 200mV, 500mV, 1.00V, 2.00V, 5.00V, 10.00V. The current 0.5 V/div setting is labelled 500mV in both views, independently of the app language. The vertical knob steps through these values without changing the other channel.

The round beige MENU ON/OFF key above the right-side softkeys shows or hides the selected channel menu, without changing selection, settings or trace visibility. / El botón redondo beige MENU ON/OFF muestra u oculta el menú del canal seleccionado sin modificar las señales ni la selección.

Vertical SCALE: drag clockwise to decrease V/div, counterclockwise to increase; right/left arrows and the mouse wheel are also supported. Hidden channels ignore adjustments. Both displays share the independent channel scales; reset restores 500mV per division. / Arrastra el mando SCALE en sentido horario para reducir V/div y antihorario para aumentarlo. También admite flechas derecha/izquierda y rueda del ratón. Solo modifica el canal seleccionado cuando está visible.

Horizontal SCALE controls the shared timebase regardless of selection or channel visibility, using the same drag, wheel and keyboard interactions. Clockwise decreases time/div; counterclockwise increases it. Steps: 10.00us, 20.00us, 50.00us, 100.0us, 200.0us, 500.0us, 1.000ms, 2.000ms, 5.000ms, 10.00ms. Reset uses 200.0us. Both views zoom around the same central time reference. / La escala horizontal es común a ambos canales y funciona aunque estén ocultos o no haya un canal seleccionado.

Vertical POSITION moves only the selected visible channel in 0.1-division steps (±4 divisions). Clockwise/up/right raises it; counterclockwise/down/left lowers it, with mouse-wheel support. Each visible channel has its own numbered ground arrow: yellow CH1 and blue CH2 indicate 0 V, moving together with their traces in both displays. Positions are independent, persist across scale changes and window closure, and reset to the centre. This display displacement does not change generator offset or circuit voltages. / POSITION desplaza solo el canal seleccionado y visible. Cada flecha de color marca su nivel de 0 V y acompaña a la señal.

Ground arrows share the same X coordinate. The selected channel is drawn last, so its arrow appears in front when markers overlap. / Las flechas de tierra están alineadas en X; en caso de solapamiento prevalece la del canal seleccionado.

Each practice owns `instrumentDefaults` alongside its component defaults. Initial load, Restore defaults and practice selection use the same state factory. RC restores square 1 kHz, 2 Vpp, 0 Vdc, CH1 output ON / CH2 OFF, kHz/Vpp/Vdc display units; scope 200.0us, both channels visible at 500mV with centred grounds, CH1 selected and channel menu closed. The generator returns to its parameter screen. Instrument windows keep their open/closed state and the app language is preserved. / Restaurar valores iniciales repone los componentes y toda la configuración de los instrumentos definida por la práctica activa.

The DS1102E AUTO key restores the active practice defaults for components, generator and oscilloscope, using the same action as Restore defaults. This is the practice reset requested for the simulator. / AUTO restaura los valores por defecto de la práctica activa, igual que Restaurar valores iniciales.

## Reusing oscilloscope functionality / Reutilizar el osciloscopio

The DS1102E adapter now contains only its faceplate, element mapping, window configuration and screen geometry. Shared modules handle the experiment controller, rotary interactions, front-panel bindings and channel-menu presentation. The signal renderer uses presentation options rather than a model-name check. Both instrument and main displays read the same controller; current DS1102E behaviour is preserved.

El DS1102E conserva su aspecto y funcionamiento. Los mandos, las acciones y la gestión común de menús se han separado para reutilizarlos con otras carátulas. No se ha añadido todavía otro modelo ni un selector. See [adding an oscilloscope model](docs/oscilloscope-models.md).

Panel regression checks: `node tests/oscilloscope-panel.test.cjs`. Practice reset checks: `node tests/practice-defaults.test.cjs`.

## Reusing generator functionality / Reutilizar el generador

The generator now has shared settings/conversion logic, a controller and common editor/menu/output bindings. The DG822 adapter contains its faceplate mapping and English presentation conventions, including its exact numeric formatting. The main summary reads the common controller. Sine/Square, RMS conversions, output behaviour and practice restoration are unchanged. See [adding a generator model](docs/generator-models.md).

El generador está preparado para otras carátulas sin copiar la lógica de unidades, validación, ondas o salidas. El DG822 mantiene su comportamiento. Panel regression checks: `node tests/generator-panel.test.cjs`.

The DS1102E first right-side blue softkey opens a visual Coupling submenu while the channel menu is shown. The current or pending option is highlighted white/black. Turn the beige multifunction knob to highlight DC, AC or Ground/Tierra, and press it to confirm. A green circular-arrow indicator above the beige multifunction knob illuminates while this submenu is open. MENU ON/OFF closes both menus and extinguishes the indicator. Switching channels or restoring defaults also dismisses the submenu; DC displays the source voltage, AC subtracts its full-period mean, and Ground displays a line at that channel’s zero reference.

Submenu navigation is shared through registered option lists and generic open/step/confirm actions. Rotation only changes a pending choice; pressing commits it to the channel and closes the submenu. MENU ON/OFF cancels a pending choice. Coupling is independent per channel, appears in both displays and resets to DC with the active practice. RC provides exact periodic means, so AC removal is independent of visible timebase and sampling; it does not simulate a physical AC-coupling high-pass cutoff. Other circuit models may provide their own mean calculation (a whole-period sampling fallback is available). Ground remains a line at the arrow even at unresolved frequencies.

La navegación con giro y pulsación es reutilizable para otros submenús. El giro solo resalta; la pulsación confirma. DC muestra la señal, AC elimina su media y Tierra muestra 0 V en la referencia del canal. Los cambios de acoplamiento solo afectan a la visualización, sin cambiar el generador ni el circuito. Pruebas: `node tests/oscilloscope-coupling.test.cjs`.

Probe/Sonda reuses the same rotary submenu selection as Coupling. All nine factors fit: 1X, 5X, 10X, 20X, 50X, 100X, 200X, 500X and 1000X. Every submenu starts at the same height; the longer probe list uses compact rows. Confirming a factor multiplies only that channel’s displayed voltage around its ground reference, after coupling, in both screens. It does not change generator/circuit voltages, the other channel, the V/div setting or the ground location. Ground coupling remains a horizontal reference line. AUTO and practice reset restore 1X. Pending changes cancel on menu closure or submenu/channel switching.

Sonda multiplica la señal por el factor seleccionado y se controla con giro y pulsación del mando beige. Los nueve factores caben y todos los submenús comienzan a la misma altura. Pruebas: `node tests/oscilloscope-probe.test.cjs`.

Horizontal POSITION moves both signals together in 0.1-division steps, independently of selection and visibility. Clockwise/right moves right, counterclockwise/left moves left; wheel input is also supported. The shared horizontal position is retained while channels are hidden and resets to zero with AUTO or practice restoration. Its range is ±5 divisions so t=0 stays visible in both screens; each display uses its own cell width with the same time-per-division and offset. Ground references and channel voltage settings stay fixed. Both probe multipliers default to 1X. Added pointer marks on rotary overlays have been removed. / La posición horizontal es común a ambos canales, incluidos los ocultos; Sonda parte de x1 y los mandos no tienen marcas añadidas. Pruebas: `node tests/oscilloscope-horizontal-position.test.cjs`.

The physical Trigger MENU key opens an English display-only menu: Mode / Edge, Source / CH1, Slope / rising-edge symbol, Sweep / Auto, Set Up. It replaces the channel menu and closes pending submenus. MENU ON/OFF closes it; pressing CH1/CH2 returns to that channel menu. Source, Slope (Rising/Falling) and LEVEL triggering are implemented; Mode, Sweep and Set Up are not editable yet. / El menú Trigger se muestra en inglés; Source y LEVEL controlan el disparo.

Trigger defaults belong to the practice: RC restores CH1, 0 V and the common time reference at the centre. Source offers CH1/CH2 through the standard rotary submenu. LEVEL steps by one tenth of the source channel’s V/div and is measured relative to that source’s ground, independently of vertical-channel selection. An orange level line and T arrow appear in both displays, then disappear together 3 seconds after the last LEVEL action without changing its programmed value. The level arrow sits in the left margin to remain visible beside open menus. Levels off the visible voltage range show only an edge marker, not a misleading clamped horizontal line.

A single crossing on the selected slope of the trigger source defines the time origin for BOTH traces. Horizontal POSITION moves that shared zero, bounded to ±5 divisions to keep it within the 10-division main preview as well as the 12-division instrument. Channel phase differences remain intact. When there is no valid crossing, both traces free-run together at 16 divisions per second with bounded 20 fps updates; returning to a valid level locks them again. Constant/off/ground signals have no edge to trigger on. RC supplies exact signal ranges and crossing times; other circuits can provide the same callbacks or use bounded numerical fallback.

El eje temporal es único: el trigger de CH1 o CH2 desplaza ambas señales juntas y mantiene su desfase. AUTO restaura CH1 y 0 V. La línea y flecha naranjas se ocultan tras 3 segundos sin tocar LEVEL, sin cambiar el nivel. Pruebas: `node tests/oscilloscope-trigger.test.cjs`.

Trigger level is shown as `TRIG LVL= 1.24V` in a blue-bordered badge at the lower left inside the plot. This badge, level line and level arrow share the same 3-second timeout. The orange upper time-zero arrow contains a T and stays visible independently. / El valor de LEVEL aparece abajo a la izquierda y se oculta a los 3 segundos; la flecha superior T marca siempre el cero temporal.

Slope offers Rising and Falling through the blue softkey, shared rotary highlight/confirm submenu and main-menu edge icon. Only confirmation changes the trigger. The chosen slope applies to the common time origin of both traces, with analytical sine/square/RC-capacitor crossings and a matching numerical fallback. Practice defaults and AUTO use Rising. `TRIG LVL` text uses the same orange as the level line and T marker. Free-running traces now move at 16 divisions/s, independently of generator frequency and timebase. / Slope permite elegir flanco ascendente o descendente; las letras de TRIG LVL son naranjas y el desplazamiento sin disparo tiene el doble de velocidad.

Free-running speed is defined in screen divisions: **16 divisions per second**. Both displays share one time offset, advanced by elapsed wall-clock time × current time/div × divisions/s. Periodic wrapping bounds the time offset without changing the signals. The main 10-division screen is traversed in 0.625 s, and the 12-division instrument in 0.75 s. A slow frame no longer clips elapsed time to 0.2 s, so processing pauses do not reduce the average programmed speed. / La señal sin disparo se desplaza a 16 divisiones por segundo en ambos canales, conservando su desfase.

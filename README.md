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
- Scope screen: yellow CH1/input and blue CH2/capacitor, with fixed 250 µs/div and 0.5 V/div (2.5 periods at 1 kHz). Component changes do not rescale the display.
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

Output1 and Output2 on the DG822 faceplate toggle independently and illuminate yellow (CH1) / blue (CH2) when enabled. Defaults: Output1 ON, Output2 OFF. Only CH1 is connected to the RC. Disabling Output1 removes both AC signal and DC offset; the steady-state circuit display becomes 0 V. Capacitor discharge transients are not modelled. Output2 has no effect on the RC. Programmed parameters persist while an output is disabled and when the window closes. Restore defaults also resets the output states. The main summary identifies the used channel (CH1) and its output state.

Output1 y Output2 se activan de forma independiente. Solo CH1 está conectado al RC. Al desactivar Output1 se retiran la señal y el offset; el modelo en régimen permanente muestra 0 V, sin simular el transitorio de descarga. Los parámetros programados se conservan. El resumen indica Canal utilizado: CH1 y el estado de su salida.

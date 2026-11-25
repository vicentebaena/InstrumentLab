# InstrumentLab

InstrumentLab is a browser-based electronics lab where students can practise using laboratory instruments at home. It combines fixed circuit connections with interactive instrument panels, so students can explore how instrument settings affect signals and measurements.

**[Open InstrumentLab](https://vicentebaena.github.io/InstrumentLab/)**

The application supports English and Spanish. It starts in Spanish and remembers the user's language preference. Instrument displays retain their equipment-specific labels and number formats.

## What you can do

- Explore an RC low-pass filter and change its resistance and capacitance.
- Configure either Rigol DG822 channel using the LCD channel selector: independent sine or square wave, frequency, amplitude, DC offset and output enable. Both channel tabs show the waveform and fixed HighZ load.
- Choose the oscilloscope model beside the circuit diagram. The DS1104Z Plus provides a 12 × 8 screen, four channel keys, a channel menu and per-channel coupling/voltage-scale readings. CH1/CH2 show the RC signals; unconnected CH3/CH4 show zero-voltage lines when enabled. Its Coupling (DC/AC/GND) and Probe (0.01X–1000X) submenus use the blue keys and multifunction knob; Invert toggles channel polarity, and the vertical scale knob provides 1–2–5 steps from 1 mV/div to 10 V/div. The horizontal scale knob covers 5 ns/div–50 s/div in 1–2–5 steps, with a live reading above the grid. Vertical and horizontal position knobs move the selected channel and the common time axis; an orange trigger arrow marks temporal zero above the grid. The trigger menu supports CH1–CH4 sources, rising/falling/either edge and level adjustment; its right-hand level arrow stays visible while the level line disappears after three seconds. Manual cursors show both X/Y pairs and seven coordinate readings, with A/B/AB movement and four-channel source selection. Trigger type, sweep and settings remain display-only. Other submenus and physical controls are not implemented.
- Practise with a Rigol DS1102E oscilloscope: channel visibility, scales, position, coupling, probe compensation, trigger, RUN/STOP, X/Y cursors and automatic measurements.
- Switch each physical probe between X1 and X10 independently of the oscilloscope's probe setting.

## Getting started

Open the [online lab](https://vicentebaena.github.io/InstrumentLab/) in a modern browser. No account or installation is required.

1. Select a practice from the circuit selector.
2. Click the generator or oscilloscope image to open its controls. Both instrument windows can stay open and be moved independently.
3. Click the R or C value to edit a component, or a coloured probe square to change its physical attenuation.
4. Observe the signals on the main page. Open the oscilloscope for its menus, cursors and measurement controls. Turn knobs by dragging, using the mouse wheel or focusing them and using the arrow keys.
5. Use **Restore defaults** or the oscilloscope's **AUTO** button to restore the active practice's initial configuration.

The RC practice starts with **R = 1 kΩ**, **C = 100 nF** and a **1 kHz, 3 Vpp square wave with a +1.5 V DC offset**. Generator CH1 drives the input; oscilloscope CH1 measures the input and CH2 measures the capacitor voltage. Both probes share the circuit ground. CH1/CH2 ground references start three divisions below the screen centre on both models. The Plus model’s unconnected CH3/CH4 start at the grid centre.

## Run locally

Download the repository or clone it:

```sh
git clone https://github.com/vicentebaena/InstrumentLab.git
cd InstrumentLab
```

Open `index.html` directly in your browser, or serve the directory with Python 3:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Keep the server running while using that address.

The application is static HTML, CSS and JavaScript. It has no build step or package installation requirement, and its local assets support offline use.

## Simulation scope

InstrumentLab implements selected instrument functions for teaching, rather than complete hardware emulation. The RC model represents an ideal periodic steady state. Hardware effects such as probe loading, noise and acquisition bandwidth are not modelled.

Automatic measurements use the visible acquisition interval and show `*****` when a result cannot be obtained, including hidden or vertically clipped signals. **RUN/STOP** retains the captured waveforms while allowing display adjustments. The main-page display shares the instrument's signals and scales, with menus and cursor overlays reserved for the instrument window.

## Development

Circuit definitions, instrument behaviour and model-specific panels are separated so additional practices and instrument models can reuse the existing functionality.

- [Adding an oscilloscope model](docs/oscilloscope-models.md)
- [Adding a function generator model](docs/generator-models.md)

Tests require Node.js. From the repository root, run:

```sh
node --test tests/*.test.cjs
```

For contributions, describe the intended behaviour and include relevant tests for changes to circuit models or instrument functions.

## Help and maintenance

Report bugs or suggest improvements through [GitHub Issues](https://github.com/vicentebaena/InstrumentLab/issues). For a bug report, include the practice, instrument settings, steps to reproduce and expected behaviour.

Maintained by **Vicente Baena Lecuyer**, Universidad de Sevilla.

## License

Source code is licensed under **MIT**. Educational content is licensed under **CC BY 4.0**, with attribution to Vicente Baena. See [LICENSE.md](LICENSE.md) for the full terms.

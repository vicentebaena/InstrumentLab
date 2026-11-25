'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['circuits.js','oscilloscope.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../app',file),'utf8'),context);
const app = context.window.InstrumentLab, scope = app.oscilloscope, practice = app.createPracticeState('rc');
const circuit = app.circuits.rc;
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);
for (const waveform of ['square','sine']) for (const coupling of ['DC','AC','GND']) {
  const generator = {...practice.generator, waveform};
  const baseline = scope.createState({channels:{1:{coupling,probe:2},2:{coupling,probe:5}}},4);
  const inverted = scope.toggleInvert(scope.pressChannel(baseline,1));
  const normal = scope.createSignals(circuit,practice.parameters,generator,baseline,{1:10,2:1});
  const flipped = scope.createSignals(circuit,practice.parameters,generator,inverted,{1:10,2:1});
  for (const time of [.00002,.0002,.0007]) {
    close(flipped.sample(time,1),-normal.sample(time,1));
    close(flipped.sample(time,2),normal.sample(time,2));
    if(coupling !== 'GND') close(flipped.toRaw(flipped.sample(time,1),1),circuit.sample(time,practice.parameters,generator).input);
  }
  const [min,max] = normal.range(1), range = flipped.range(1);
  close(range[0],-max);close(range[1],-min);
  assert.equal(inverted.channels[1].positionDivisions,baseline.channels[1].positionDivisions);
  const triggerState = {...inverted,trigger:{...inverted.trigger,level:coupling==='AC'?0:-.3}};
  const acquired = scope.analyzeTrigger(circuit,practice.parameters,generator,triggerState,flipped);
  if(coupling==='GND') assert.equal(acquired.locked,false);
  else {
    assert.equal(acquired.locked,true);
    assert.ok(flipped.sample(acquired.time+1e-9,1)>flipped.sample(acquired.time-1e-9,1),'rising display trigger uses a falling raw edge');
    const fallback = scope.analyzeTrigger({...circuit,triggerCrossing:undefined},practice.parameters,generator,triggerState,flipped);
    assert.equal(fallback.locked,true);
    close(acquired.time,fallback.time);
  }
}
// Unresolved-frequency bands must keep positive height after inversion.
const settings = scope.createState({channels:{1:{inverted:true,positionDivisions:0,voltsPerDivision:1}}});
const dense = scope.render(circuit,practice.parameters,{...practice.generator,frequency:1e7,offset:.5},k=>k,String,'invert',12,settings);
const band = dense.match(/<rect x="36" y="([^"]+)" width="[^"]+" height="([^"]+)" fill="#f4d35e" fill-opacity="0.3"/);
assert.ok(band); assert.ok(Number(band[2])>1);
console.log('Invert negates DC/AC/probe signals about their ground, preserves other channels, sorts ranges, reverses raw trigger edges and renders dense bands.');

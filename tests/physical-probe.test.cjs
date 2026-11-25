'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = vm.createContext({ window: { InstrumentLabImages: { generator: '', scope: '' } } });
for (const file of ['circuits.js','oscilloscope.js','oscilloscope-controller.js','translations.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../app',file),'utf8'),context);
const app = context.window.InstrumentLab, scope=app.oscilloscope;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
let practice=app.createPracticeState('rc');
assert.equal(practice.probes[1],1);assert.equal(practice.probes[2],1);
const other=app.createPracticeState('rc');practice.probes[1]=10;assert.equal(other.probes[1],1);
for(const coupling of ['DC','AC','GND'])for(const waveform of ['square','sine']){
 const generator={...practice.generator,waveform,offset:.4};
 const settings=scope.createState({channels:{1:{coupling},2:{coupling}}});
 const normal=scope.createSignals(app.circuits.rc,practice.parameters,generator,settings,{1:1,2:1});
 const attenuated=scope.createSignals(app.circuits.rc,practice.parameters,generator,settings,{1:10,2:1});
 for(const time of [.00003,.0002,.0007]){
  close(attenuated.sample(time,1),normal.sample(time,1)/10);
  close(attenuated.sample(time,2),normal.sample(time,2));
 }
 close(attenuated.range(1)[1],normal.range(1)[1]/10);
 const baseline=normal.sample(.0002,1);
 settings.channels[1].probe=10;
 const compensated=scope.createSignals(app.circuits.rc,practice.parameters,generator,settings,{1:10,2:1});
 close(compensated.sample(.0002,1),baseline);
 const raw=app.circuits.rc.sample(.0002,practice.parameters,generator).input;
 if(coupling!=='GND')close(compensated.toRaw(compensated.transform(raw,1),1),raw);
}
practice=app.createPracticeState('rc');
const controller=app.createOscilloscopeController({getSettings:()=>practice.oscilloscope,setSettings:s=>{practice.oscilloscope=s;},getExperiment:()=>({circuit:app.circuits.rc,parameters:practice.parameters,generator:practice.generator,probes:practice.probes}),onChange(){},onAuto(){practice=app.createPracticeState('rc');},t:k=>app.translations.en[k],format:String});
const traces=()=>Array.from(controller.getDisplay().matchAll(/<path d="([^"]+)" stroke="(#[^"]+)"/g),m=>m[1]);
const initial=traces();
const originalScope=JSON.stringify(practice.oscilloscope);
practice.probes[1]=10;
assert.equal(JSON.stringify(practice.oscilloscope),originalScope,'physical attenuation must not change any oscilloscope setting');
assert.notEqual(traces()[0],initial[0]);assert.equal(traces()[1],initial[1]);
practice.oscilloscope.trigger.level=.35;
assert.equal(controller.getAcquisition().locked,false,'attenuated CH1 cannot reach 0.35 V');
practice.oscilloscope.channels[1].probe=10;
assert.equal(controller.getAcquisition().locked,true,'scope compensation restores trigger range');
practice.oscilloscope.trigger.level=0;practice.oscilloscope.channels[1].probe=1;
controller.actions.runStop();const stopped=traces();practice.probes[1]=1;assert.deepEqual(traces(),stopped,'physical switch must not alter an existing acquisition');
controller.actions.runStop();assert.deepEqual(traces(),initial);
practice.probes[2]=10;controller.actions.auto();assert.equal(practice.probes[1],1);assert.equal(practice.probes[2],1);
const diagram=app.circuits.rc.diagram({resistanceLabel:'1 kΩ',capacitanceLabel:'100 nF',probes:{1:10,2:1}},k=>app.translations.es[k]);
assert.ok(diagram.includes('data-probe="1"'));assert.ok(diagram.includes('data-probe="2"'));
assert.ok(diagram.includes('>X10</text>'));assert.ok(diagram.includes('>X1</text>'));
console.log('Physical attenuation: independent channels, scope compensation, coupling, trigger, STOP, defaults and diagram passed.');

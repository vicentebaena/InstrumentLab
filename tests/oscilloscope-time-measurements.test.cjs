'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c={window:{}};
for(const f of ['circuits.js','oscilloscope.js','translations.js'])vm.runInNewContext(fs.readFileSync('app/'+f,'utf8'),c);
const app=c.window.InstrumentLab,scope=app.oscilloscope,circuit=app.circuits.rc;
// Use a centred, zero-offset signal for the analytical measurement fixtures.
const createMeasurementPractice=()=>{
 const practice=app.createPracticeState('rc');
 practice.generator.offset=0;
 practice.oscilloscope.channels[1].positionDivisions=0;
 practice.oscilloscope.channels[2].positionDivisions=0;
 return practice;
};
let practice=createMeasurementPractice();
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const stats=(channel=1,duration=.003)=>{const v=scope.voltageStatistics(circuit,practice.parameters,practice.generator,practice.oscilloscope,practice.probes,-.00025,duration,channel);return scope.timeStatistics(circuit,practice.parameters,practice.generator,practice.oscilloscope,practice.probes,-.00025,duration,channel,v);};
let first=stats();close(first.Period,.001);close(first.Freq,1000);close(first['+Width'],.0005);close(first['-Width'],.0005);close(first['+Duty'],50);close(first['-Duty'],50);close(first['Rise Time'],0);close(first['Fall Time'],0);
let second=stats(2);const peak=circuit.range(practice.parameters,practice.generator).output[1];const lag=practice.parameters.resistance*practice.parameters.capacitance*Math.log(1+peak);
close(scope.channelDelay(first,second),lag,1e-7);close(scope.channelDelay(first,second,true),lag,1e-7);close(scope.channelDelay(first,second,false,true),lag/.001*360,1e-3);
practice.generator.waveform='sine';first=stats();close(first['Rise Time'],2*Math.asin(.8)/(2*Math.PI*1000),1e-8);close(first['Fall Time'],first['Rise Time']);close(first['+Duty'],50);
second=stats(2);const sineLag=Math.atan(2*Math.PI*1000*.0001)/(2*Math.PI*1000);close(scope.channelDelay(first,second),sineLag,1e-8);
practice.oscilloscope.channels[2].visible=false;assert.equal(stats(2),null);assert.equal(scope.channelDelay(first,stats(2)),undefined);
practice.oscilloscope.channels[2].visible=true;practice.oscilloscope.channels[1].voltsPerDivision=.1;assert.equal(stats(),null);
practice=createMeasurementPractice();assert.equal(stats(1,.0001)?.Freq,undefined);
practice.generator.output1Enabled=false;assert.equal(stats(),null);
assert.equal(scope.formatTimeMeasurement(.001,'Period'),'1.00ms');assert.equal(scope.formatTimeMeasurement(1000,'Freq'),'1.00kHz');assert.equal(scope.formatTimeMeasurement(undefined,'Freq'),'*****');
let state=scope.openMeasureMenu(scope.createState());state=scope.openSubmenu(state,'measureTime');
const definition=scope.submenus.measureTime,page=()=>scope.submenuPage(definition.options,state.submenuSelection,4,state.submenuPageStart,definition.pageStarts);
for(const [steps,start,expected] of [[0,0,'Period,Freq,Rise Time,Fall Time'],[4,4,'+Width,-Width,+Duty,-Duty'],[4,6,'+Duty,-Duty,DelayRise,DelayFall'],[2,8,'DelayRise,DelayFall,PhaseRise,PhaseFall']]){
 for(let i=0;i<steps;i++)state=scope.stepSelection(state,1);
 assert.equal(page().start,start);assert.equal(page().values.join(','),expected);
}
for(let i=0;i<30;i++)state=scope.stepSelection(state,1);assert.equal(state.submenuSelection,'PhaseFall');assert.equal(page().next,false);
state=scope.confirmSubmenu(state);assert.equal(state.measurements[0].parameter,'PhaseFall');
for(const parameter of ['Freq','+Duty','DelayRise']){state=scope.openSubmenu(state,'measureTime');state.submenuSelection=parameter;state=scope.confirmSubmenu(state);}
assert.equal(state.measurements.length,3);assert.equal(state.measurements[0].parameter,'Freq');
console.log('Time measures: period/frequency, 10–90% edges, widths/duty, rising/falling delay/phase, invalid inputs and four overlapping pages passed.');

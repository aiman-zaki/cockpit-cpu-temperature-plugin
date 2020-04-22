declare var require:(moduleId:string) => any;
var cockpit = require("cockpit");

import React , {Component , MouseEvent, ChangeEvent , FormEvent} from 'react';
import * as Chart from 'chart.js'
import { TextInput, TextInputProps, Button } from '@patternfly/react-core';

import './temperature.scss'
export interface ChartData {
    time:string,
    temperature:string,
    intervalId:number,
    interval:number,
    maxXaxis:number,
}

export  default class TemperatureLineGraph extends Component<any,any> {    
    chartData:ChartData
    buttonState:boolean
    chart:any
    
    constructor(props:any) {
        super(props);
        this.chartData = {
            time:"",
            temperature:"",
            intervalId:0,
            interval:5000,
            maxXaxis:10,
        }
        this.buttonState = false
    }

    private chartRef = React.createRef<any>()

    logFormat(){
        return "\nTemperature :"+this.chartData.temperature+" Time: "+this.chartData.time
    }

    writeLog(){
        let file = cockpit.file("/home/aiman/test.log")
        file.modify((oldContent) => {
            return oldContent+this.logFormat()
        })
    }

    onMaxAxisButton(event:FormEvent<HTMLButtonElement>){
        event.preventDefault();
        this.setState({})
    }

    handleMaxAxisInput(value:string,event:FormEvent<HTMLInputElement>){
        isNaN(parseFloat(event.currentTarget.value)) ? this.chartData.maxXaxis = 0 
        : this.chartData.maxXaxis = parseFloat(event.currentTarget.value)
        this.setState({})
    }
    
    handleTextInputChange(value:string,event: FormEvent<HTMLInputElement>){
        isNaN(parseFloat(event.currentTarget.value)) ? this.chartData.interval = 0 
        : this.chartData.interval = parseFloat(event.currentTarget.value)
        this.setState({})

    }

    stopInterval(event:MouseEvent) {
        event.preventDefault();
        clearInterval(this.chartData.intervalId);
        this.buttonState = false 
        this.setState({})
    }

    async startInterval() {
        this.buttonState = true 
        this.setState({})
        this.chartData.intervalId = setInterval(async () => {
            await this.readTime();
            await this.readTemperature();
            this.writeLog();
            this.removeLabelsAndTemp(this.chart);
            this.updateGraphUsingState(this.chart);
        }, this.chartData.interval);
    }

    renderButtonControl(){
        if(this.buttonState){
            return <Button onClick={this.stopInterval.bind(this)}  variant="danger">Stop</Button>
        } else {
            return <Button onClick={this.startInterval.bind(this)} variant="primary">Start</Button>
        }
    }

    async readTime() {
        const process = cockpit.spawn([`date`, `+"%T"`]);
        process.stream((data) => {
            data = data.replace(/["|']|\r?\n|\r/g, "");
            this.chartData.time = data
        });
        process.done();
        return process;
    }

    removeLabelsAndTemp(chart) {
        if (chart.data.labels.length > this.chartData.maxXaxis) {
            chart.data.labels.shift();
            chart.data.datasets.forEach((dataset) => {
                dataset.data.shift();
            });
        }
    }

    updateGraphUsingState(chart) {
        chart.data.labels.push(this.chartData.time);
        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(this.chartData.temperature);
        });
        chart.update();
    }

    readTemperature() {
        const process = cockpit.spawn(["cat", "/sys/class/thermal/thermal_zone0/temp"]);
        process.stream((data) => {
            data = data.replace(/["|']|\r?\n|\r/g, "");
            data = data / 1000;
            this.chartData.temperature = data
        });
        return process;
    }

    initalChart(ref):Chart {
        const chart = new Chart(ref, {
            type: "line",
            data: {
                //  Bring in data
                labels: [],
                datasets: [
                    {
                        label: "Temperature",
                        data: [],
                    }
                ]
            },
            options: {
            }
        });
        return chart;
    }

    componentDidUpdate(){

    }

    componentDidMount() {
        const myChartRef = this.chartRef.current!.getContext("2d");
        this.chart = this.initalChart(myChartRef);
    }

    render() {
        return (
            <div className = "pf-c-card">
                <div className="pf-c-card__head">
                    <h4>Temperature</h4>
                </div>
                <div className="pf-c-card__body">
              
                    <div className="pf-l-grid pf-m-gutter">
                        <div className="pf-l-grid__item pf-m-6-col">
                            <div className = "temperature-graph">
                                <canvas
                                    id="myChart"
                                    ref={this.chartRef}
                                />
                            </div>
                        </div>
                        <div className="pf-l-grid__item pf-m-6-col">
                            <div className = "pf-l-grid pf-m-gutter">
                                <div className = "pf-l-grid__item pf-m-6-col">
                                    <span> Interval(miliseconds) : </span><TextInput value={this.chartData.interval} type="text" onChange={this.handleTextInputChange.bind(this)} aria-label="text input example" />
                                </div>
                                <div className = "pf-l-grid__item pf-m-6-col">
                                    <br></br>
                                    {this.renderButtonControl()}
                                </div>
                            </div>
                            <br></br>
                            <div className = "pf-l-grid pf-m-gutter">
                                <div className = "pf-l-grid__item pf-m-6-col">
                                <span> Max Graph Vertical : </span> <TextInput value={this.chartData.maxXaxis} type="text" onChange={this.handleMaxAxisInput.bind(this)} aria-label="text input example" />
                                </div>
                                <div className = "pf-l-grid__item pf-m-6-col">
                                    <br></br>
                                    <Button onChange={this.onMaxAxisButton.bind(this)}>Confirm</Button>
                                </div>
                            </div>
                            <br></br>
                    
                        </div>
                    </div>
                </div>
                <div className="pf-c-card__footer">
                 
                </div>
            </div>
        );
    }
}

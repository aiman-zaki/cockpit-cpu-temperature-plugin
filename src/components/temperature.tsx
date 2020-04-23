declare var require:(moduleId:string) => any;
var cockpit = require("cockpit");

import React , {Component , MouseEvent, ChangeEvent , FormEvent} from 'react';
import * as Chart from 'chart.js'
import { TextInput, TextInputProps, Button , Card,CardBody,CardHead,Alert,AlertVariant} from '@patternfly/react-core';
import ToastAlertGroup from  './toast'
import './temperature.scss'

export interface LogData{
    path:string,
    file:string,
    willLog:boolean
}
export interface ChartData {
    time:string,
    temperature:string,
    intervalId:number,
    interval:number,
    maxXaxis:number,
    color:string,
}

export  default class TemperatureLineGraph extends Component<any,any> {    
    chartData:ChartData
    buttonState:boolean
    chart:any
    logData:LogData
    file:any
    toastChild:React.RefObject<ToastAlertGroup>

    
    constructor(props:any) {
        super(props);
        this.chartData = {
            time:"",
            temperature:"",
            intervalId:0,
            interval:5000,
            maxXaxis:10,
            color: "#06c"
        }
        this.buttonState = false
        this.logData = {
            path:"",file:"",willLog:false,
        }
        this.toastChild = React.createRef()
    }

    private chartRef = React.createRef<any>()

  

    logFormat(){
        return "\nTemperature :"+this.chartData.temperature+" Time: "+this.chartData.time
    }

    writeLog(){
        cockpit.file(this.logData.path+this.logData.file+".log")
            .modify((oldContent) => {
                return oldContent+this.logFormat()
            })
        
    }

    async createFile(){
        let process = cockpit.spawn(["touch",this.logData.path+this.logData.file+".log"])
        process.done(() => {
            this.toastChild.current?.addAlert({
                title:"File Created",
                variant:"primary",
                key:"file_created"
            })
            this.setState({})
        })
        process.fail(e => {
            console.log(e)
        })
        return process
    }

    async checkPath(){
        if(this.logData.path.slice(-1) != "/"){
            this.logData.path = this.logData.path+"/"
        }

        let script = `[ -d $1 ] && echo true || echo false`
        let exist = false
        await cockpit.script(script,[this.logData.path])
            .done((m:boolean) => {
                exist = m
            })

        return exist
       
    }

    async createPath(){
        let process = cockpit.spawn(["mkdir","-p",this.logData.path])
        process.stream()
        process.done(console.log("path created"))
        return process
    }

    async prepareFile(event:FormEvent<HTMLButtonElement>){
        event.preventDefault()
        if(this.logData.file != "" && this.logData.path != ""){
            this.logData.willLog = true
            let exist = await this.checkPath()
            if(exist){
                cockpit.file(this.logData.path+this.logData.file+".log").read()
                .done(async (content,tag) => {
                    if(content == null && tag == '-'){
                        console.log(content)
                        await this.createFile()
                    } else {
                        this.toastChild.current?.addAlert({
                            title:"Using existing log file",
                            variant:"primary",
                            key:"existing_log_file"
                        })
                        this.setState({})
                    }
                })
            } else {
                this.toastChild.current?.addAlert({
                    title:"Specify path doest not exist",
                    variant:"danger",
                    key:"path_not_exist"
                })
            }
        } else {
            this.toastChild.current?.addAlert({
                title:"Please fill both form",
                variant:"danger",
                key:"fill_form"
            })
        }
        this.setState({})

    }

    handleLogFile(valie:string,event:FormEvent<HTMLInputElement>){
        this.logData.file = event.currentTarget.value
        this.setState({})
    }

    handleLogPath(value:string,event:FormEvent<HTMLInputElement>){
        this.logData.path = event.currentTarget.value
        this.setState({})
    }

    stopLogHandler(){
        this.logData.willLog = false
        this.setState({})
    }

    renderLogButton(){
        if(this.logData.willLog){
            return  <Button variant="danger" onClick={this.stopLogHandler.bind(this)}> Stop Log </Button>
        } else {
            return  <Button variant="secondary"  onClick={this.prepareFile.bind(this)}> Start Log </Button>
        }
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
    
    handleTextColorChange(value:string,event: FormEvent<HTMLInputElement>){
        this.chartData.color = event.currentTarget.value
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
        this.toastChild.current?.addAlert({
            title:"Stopped",
            variant:"danger",
            key:"stop_temperature"
        })
        this.setState({})
    }

    async startInterval() {
        this.buttonState = true 
        this.toastChild.current?.addAlert({
            title:"Starting",
            variant:"primary",
            key:"start_temp"
        })
        this.setState({})
        this.chartData.intervalId = setInterval(async () => {
            await this.readTime();
            await this.readTemperature();
            if(this.logData.willLog){
                this.writeLog();
            }
            this.removeLabelsAndTemp(this.chart);
            this.updateGraphUsingState(this.chart);
        }, this.chartData.interval);
    }

    renderButtonControl(){
        if(this.buttonState){
            return <Button onClick={this.stopInterval.bind(this)}  variant="danger">Stop</Button>
        } else {
            return <Button onClick={this.startInterval.bind(this)} variant="secondary">Start</Button>
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
                        label: "CPU",
                        data: [],
                        backgroundColor: this.chartData.color
                    }
                ]
            },
            options: {
                scales: {
                    xAxes: [{
                        display: "auto",
                        gridLines: {
                            display:false
                        }
                    }],
                    yAxes: [{
                        position:"right",
                        display: "auto",
                        gridLines: {
                            display:false
                        },
                        ticks: {
                            min: 0,
                            stepSize: 10
                        }
                    }]
                }
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
            <div className="pf-l-grid">
                <ToastAlertGroup  ref={this.toastChild}></ToastAlertGroup>
                <div className="pf-l-grid__item pf-m-6-col">
                    <Card>
                        <CardHead>Temperature</CardHead>
                        <CardBody>
                            <div className = "temperature-graph">
                            <canvas
                                id="myChart"
                                ref={this.chartRef}
                            />
                        </div>
                        </CardBody>
                    </Card>
                </div>
                <div className="pf-l-grid__item pf-m-6-col">
                    <Card>
                        <CardHead>
                            Options
                        </CardHead>
                        <CardBody>
                        <div className = "pf-l-grid pf-m-gutter">
                            <div className = "pf-l-grid__item pf-m-4-col">
                                <span> Interval(miliseconds) : </span><TextInput value={this.chartData.interval} type="text" onChange={this.handleTextInputChange.bind(this)} aria-label="text input example" />
                            </div>
                            <div className = "pf-l-grid__item pf-m-2-col">
                                <br></br>
                                {this.renderButtonControl()}
                            </div>
                            <div className = "pf-l-grid__item pf-m-4-col">
                                <span> Max Graph Vertical : </span> <TextInput value={this.chartData.maxXaxis} type="text" onChange={this.handleMaxAxisInput.bind(this)} aria-label="text input example" />
                            </div>
                            <div className = "pf-l-grid__item pf-m-2-col">
                                <br></br>
                                <Button variant="secondary" onClick={this.onMaxAxisButton.bind(this)}>Confirm</Button>
                            </div>
                        </div>
                        <br></br>
                        <div className = "pf-l-grid pf-m-gutter center">
                            <div className = "pf-l-grid__item pf-m-5-col">
                            <span> Path : </span> <TextInput value={this.logData.path} type="text" onChange={this.handleLogPath.bind(this)} aria-label="text input example" />
                            </div>
                            <div className = "pf-l-grid__item pf-m-5-col" >
                                <span> File : </span> <TextInput value={this.logData.file} type="text" onChange={this.handleLogFile.bind(this)} aria-label="text input example" />
                            </div>
                            <div className = "pf-l-grid__item pf-m-2-col">
                                <br></br>
                                {this.renderLogButton()}
                            </div>
                        </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        );
    }
}

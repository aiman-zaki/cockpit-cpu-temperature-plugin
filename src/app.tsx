/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

declare var require:(moduleId:string) => any;
var cockpit = require("cockpit");
import React from 'react';
import './app.scss';
import * as Chart from 'chart.js'


export default class Application extends React.Component {
    state = {
        time:"",
        temperature:"",
        intervalId:0,
        interval:1000,
    }
    
    constructor(props:any) {
        super(props);
     
    }

    private chartRef = React.createRef<any>()


    async readTime() {
        const process = cockpit.spawn([`date`, `+"%T"`]);
        process.stream(this.updateTime);
        process.done(console.log("read time"));
        return process;
    }

    updateTime(data) {
        data = data.replace(/["|']|\r?\n|\r/g, "");
        console.log(data);
        this.setState(prevState => ({
            time:data
        }));
    }

    removeLabelsAndTemp(chart) {
        console.log(chart.data.labels.length);
        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets.forEach((dataset) => {
                dataset.data.shift();
            });
        }
    }

    updateGraphUsingState(chart) {
        chart.data.labels.push(this.state.time);
        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(this.state.temperature);
        });
        chart.update();
    }

    updateTemperature(data) {
        data = data.replace(/["|']|\r?\n|\r/g, "");
        data = data / 1000;
        this.setState(prevState => ({
            temperature:data
        }));
        console.log(this.state);
    }

    readTemperature() {
        const process = cockpit.spawn(["cat", "/sys/class/thermal/thermal_zone0/temp"]);
        process.stream(this.updateTemperature);
        process.done(console.log("read temp"));
        return process;
    }

    initalChart(ref) {
        const chart = new Chart(ref,{
            
        })
    }

    stopInterval(id) {
        clearInterval(id);
    }

    startInterval(chart) {
        this.state.intervalId = setInterval(async () => {
            await this.readTime();
            await this.readTemperature();
            this.removeLabelsAndTemp(chart);
            this.updateGraphUsingState(chart);
        }, this.state.interval);
    }

    async componentDidMount() {
        //const myChartRef = this.chartRef.current!.getContext("2d");
        //let chart = this.initalChart(myChartRef);
        //this.startInterval(chart)

    }

    render() {
        return (
          <div>
          </div>
        );
    }
}

'use babel';

const d3 = require('d3');
const moment = require('moment');
const Base64 = require('js-base64').Base64;
const _ = require('underscore');

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;
const DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_COLORS = ['#222', '#555', '#888', '#bbb'];
const LEGEND_X = 10;
const LEGEND_Y = 2.5;
const LEGEND_PAD = 3;

const CURVES = new Map([
    ['basis', d3.curveBasis],
    ['cardinal', d3.curveCardinal],
    ['catmullRom', d3.curveCatmullRom],
    ['linear', d3.curveLinear],
    ['monotoneX', d3.curveMonotoneX],
    ['monotoneY', d3.curveMonotoneY],
    ['step', d3.curveStep],
    ['stepAfter', d3.curveStepAfter],
    ['stepBefore', d3.curveStepBefore]
]); //check http://bl.ocks.org/d3indepth/b6d4845973089bc1012dec1674d3aff8

function validateSettings(settings) {
    if (!settings) {
        throw "No settings";
    }

    if (!settings.svg || settings.svg.tagName.toLowerCase() !== 'svg') {
        throw "No svg";
    }

    validateData(settings);
    validateMargins(settings);
    validateStyles(settings);
    validateDrawOptions(settings);
    validateCurveOptions(settings);
}

function validateData(settings) {
    if (!settings.data) {
        throw "No data";
    }

    if (!settings.data.entries) {
        throw "No data entries";
    }

    if (!Array.isArray(settings.data.entries)) {
        throw "Data entries not an array";
    }

    if (!settings.data.entries.length) {
        throw "Empty data entries";
    }

    if (!settings.data.keys) {
        throw "No keys defined"
    } else {
        settings.data.reverseKeys = [...settings.data.keys].reverse();
    }
}

function validateMargins(settings) {
    if (!settings.margin) {
        settings.margin = {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
        }
    } else {
        if (!('top' in settings.margin)) {
            settings.margin.top = 50;
        }
        if (!('right' in settings.margin)) {
            settings.margin.right = 50;
        }
        if (!('bottom' in settings.margin)) {
            settings.margin.bottom = 50;
        }
        if (!('left' in settings.margin)) {
            settings.margin.left = 50;
        }
    }

    if (!('width' in settings)) {
        settings.width = DEFAULT_WIDTH;
    }
    settings.innerWidth = settings.width - settings.margin.left - settings.margin.right;

    if (!('height' in settings)) {
        settings.height = DEFAULT_HEIGHT;
    }
    settings.innerHeight = settings.height - settings.margin.top - settings.margin.bottom;
}

function validateStyles(settings) {
    if (!settings.style) {
        settings.style = {
            fontSize: 12,
            fontFamily: 'sans-serif',
            color: '#222',
            backgroundColor: '#fff'
        };
        settings.style.markers = {
            backgroundColor: settings.style.backgroundColor,
            color: settings.style.color
        };
        settings.style.axis = {
            color: settings.style.color,
        };
    } else {
        if (!settings.style.fontSize) {
            settings.style.fontSize = 12;
        }
        if (!settings.style.fontFamily) {
            settings.style.fontFamily = 'sans-serif';
        }
        if (!settings.style.color) {
            settings.style.color = '#222';
        }
        if (!settings.style.backgroundColor) {
            settings.style.backgroundColor = '#fff';
        }
        if (!settings.style.axis) {
            settings.style.axis = {
                color: settings.style.color
            }
        } else {
            if (!settings.style.axis.color) {
                settings.style.axis.color = settings.style.color
            }
        }
        if (!settings.style.markers) {
            settings.style.markers = {
                backgroundColor: settings.style.backgroundColor,
                color: settings.style.color
            }
        } else {
            if (!settings.style.markers.backgroundColor) {
                settings.style.markers.backgroundColor = settings.style.backgroundColor;
            }
            if (!settings.style.markers.color) {
                settings.style.markers.color = settings.style.color;
            }
        }
    }
}

function validateDrawOptions(settings) {
    if (!settings.drawOptions) {
        settings.drawOptions = ['title', 'axis', 'legend', 'markers', 'focus'];
    }
}

function validateCurveOptions(settings) {
    if (!settings.curve) {
        settings.curve = {
            type: 'linear'
        }
    } else if (!settings.curve.type) {
        settings.curve.type = 'linear';
    }
}


function prepareSVG(settings) {
    settings.d3svg = d3.select(settings.svg);

    settings.d3svg
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', settings.width)
        .attr('height', settings.height);

    settings.g = settings.d3svg.append("g");
    if (settings.margin.left || settings.margin.top) {
        settings.g.attr("transform", "translate(" + settings.margin.left + "," + settings.margin.top + ")");
    }
}


function getStartOfDay(date) {
    return moment(moment(date).format('YYYY-MM-DD'));
}


function prepareScales(settings) {
    settings.x = d3.scaleTime()
        .range([0, settings.innerWidth]);
    settings.y = d3.scaleLinear()
        .range([settings.innerHeight, 0]);
}

function prepareDataFunctions(settings) {

    let curve = CURVES.get(settings.curve.type);
    if (settings.curve.type == 'cardinal' && settings.curve.tension) {
        curve = curve.tension(settings.curve.tension);
    } else if (settings.curve.type == 'catmullRom' && settings.curve.alpha) {
        curve = curve.alpha(settings.curve.alpha);
    }
    //alpha, beta, tension
    settings.stack = d3.stack();
    settings.area = d3.area()
        .curve(curve)
        .x(function (d) {
            return settings.x(getStartOfDay(d.data.date));
        })
        .y0(function (d) {
            return settings.y(d[0]);
        })
        .y1(function (d) {
            return settings.y(d[1]);
        });

    settings.fromDate = settings.fromDate ? getStartOfDay(settings.fromDate) : settings.fromDate;
    settings.toDate = settings.toDate ? getStartOfDay(settings.toDate) : settings.toDate;


    let xRange = d3.extent(settings.data.entries, function (d) {
        return getStartOfDay(d.date);
    });

    if (settings.fromDate) {
        xRange[0] = settings.fromDate;
    }
    if (settings.toDate) {
        xRange[1] = settings.toDate;
    }
    settings.x.domain(xRange);

    settings.stack.keys(settings.data.keys);
    settings.y.domain([0, d3.max(settings.data.entries, function (d) {
        let sum = 0;
        for (let i = 0, n = settings.data.keys.length; i < n; i++) {
            sum += d[settings.data.keys[i]];
        }
        return sum;
    })]);
}

function drawLayers(settings) {

    let layer = settings.g.selectAll('.layer')
        .data(settings.stack(settings.data.entries.filter(function (d) {
            return isDateInRange(d.date, settings);
        })))
        .enter()
        .append('g')
        .attr('class', 'layer');

    layer
        .append('path')
        .attr('class', 'area')
        .style('fill', function (d) {
            return getColor(d.key, settings);
        })
        .style('stroke', function (d) {
            return getStroke(d.key, settings);
        })
        .style('stroke-width', '.5')
        .attr('d', settings.area);

}

function drawFocus(settings) {

    if (settings.drawOptions.includes('focus')) {
        const lineHeight = settings.style.fontSize;

        let drawFocusItems = function (dataSet) {
            hideFocus();

            let x = settings.x(dataSet.date) + 0.5; //perfect align marker
            let y = LEGEND_Y + lineHeight / 2;
            let row = 0.5;
            let width = 0;

            let y1 = settings.innerHeight;
            let y2 = 0;
            if (!dataSet.date.isSame(settings.toDate) || !settings.drawOptions.includes('axis')) {
                //as we have an axis at the right side, we only draw
                //the marker if its not directly on top of the axis

                if (x > 0.5) {
                    markerBackground
                        .attr('x1', x)
                        .attr('y1', y1)
                        .attr('x2', x)
                        .attr('y2', y2)
                        .style('display', null);
                }
                marker
                    .attr('x1', x)
                    .attr('y1', y1)
                    .attr('x2', x)
                    .attr('y2', y2)
                    .style('display', null);
            }            

            focus
                .attr('x', (x + 2))
                .attr('y', (y - LEGEND_PAD))
                .attr('height', (.5 + row + dataSet.__count) * lineHeight)
                .style('display', null);

            let count = 0;
            for (let key of _.keys(dataSet)) {
                if (!key.startsWith('__')) {
                    focusItems[count]
                        .attr('x', x + LEGEND_PAD + 2,)
                        .attr('y', key == 'date' ? y + row * lineHeight : y + (0.5 + row) * lineHeight)
                        .style('display', null)
                        .text(key == 'date' ? moment(dataSet[key]).format(DATE_FORMAT) : dataSet[key] + ' ' + key)    
                    try {
                        let bbx = focusItems[count].node().getBBox();
                        width = Math.max(width, bbx.width + 2 * LEGEND_PAD);
                    } catch (e) { }
                    row++;
                    count++;
                }
            }
            focus.attr('width', width);
            
            if (x + 2 + width >= settings.innerWidth) {
                let offset = - (2 + width);
                focus.attr('x', x + offset);
                for(let focusItem of focusItems) {
                    focusItem.attr('x', x + LEGEND_PAD + offset);
                }
            }

        }

        let mousemove = function () {
            let date = getStartOfDay(settings.x.invert(d3.mouse(this)[0]));
            let lastDate = getLastEntryDate(settings);

            if (date.isAfter(lastDate)) {
                date = lastDate;
            }

            let dataSet = getDataSet(date, settings);
            if (dataSet && dataSet.__count > 1) {
                drawFocusItems(dataSet);
            } else {
                hideFocus();
            }
        }

        let hideFocus = function () {
            focus.style('display', 'none');
            for (let focusItem of focusItems) {
                focusItem.style('display', 'none');
            }
            markerBackground.style('display', 'none');
            marker.style('display', 'none');
        }

        let focus = settings.g.append("rect")
            .attr('fill', settings.style.backgroundColor)
            .attr('stroke', settings.style.color)
            .attr('class', 'focus-item')
            .attr('width', lineHeight)
            .attr('height', lineHeight)
            .style('display', 'none');

        let focusItems = [];
        for (let i = 0; i < 40; i++) {
            let focusItem = settings.g.append('text')
                .attr('dy', dy(settings))
                .attr('font-size', settings.style.fontSize + 'px')
                .attr('font-family', settings.style.fontFamily)
                .style('text-anchor', 'start')
                .style('fill', settings.style.color)
                .style('display', 'none')
                .text('');

            focusItems.push(focusItem);
        }

        let markerBackground = settings.g.append('line')
            .style('display', 'none')        
            .style('stroke-width', '3')
            .style('stroke', settings.style.markers.backgroundColor);

        let marker = settings.g.append('line')
            .style('display', 'none')
            .style('stroke-width', '1')
            .style('stroke', settings.style.markers.color);

        settings.g.append("rect")
            .attr('width', settings.innerWidth + settings.margin.right)
            .attr('height', settings.innerHeight)
            .attr('fill', 'transparent')
            .on('mousemove', mousemove)
            .on('mouseout', hideFocus);

    }
}

function getColor(key, settings) {
    if (settings.style[key] && settings.style[key].color) {
        return settings.style[key].color;
    } else {
        let index = settings.data.reverseKeys.indexOf(key) % DEFAULT_COLORS.length;
        return DEFAULT_COLORS[index];
    }
}

function getStroke(key, settings) {
    if (settings.style[key] && settings.style[key].stroke) {
        return settings.style[key].stroke;
    } else {
        return settings.style.backgroundColor;
    }
}

function getDataSet(date, settings) {
    for (let entry of settings.data.entries) {
        if (moment(entry.date).isSame(date, 'day')) {
            //sort the result
            let result = {
                date: getStartOfDay(entry.date),
                __sum: 0,
                __count: 1
            }
            for (let key of settings.data.reverseKeys) {
                if (_.isNumber(entry[key]) && entry[key] > 0) {
                    //count only positive numbers
                    result[key] = entry[key];
                    result.__sum += entry[key];
                    result.__count += 1;
                }
            }
            return result;
        }
    }
    return null;
}

function isDateInRange(date, settings) {
    let dataFromDate, dataToDate;
    let momentDate = getStartOfDay(date);

    dataFromDate = getFirstEntryDate(settings);
    dataToDate = getLastEntryDate(settings);

    if (settings.fromDate && momentDate.isBefore(settings.fromDate)) {
        return false;
    } else if (!settings.fromDate && momentDate.isBefore(dataFromDate)) {
        return false;
    }

    if (settings.toDate && momentDate.isAfter(settings.toDate)) {
        return false;
    } else if (!settings.toDate && momentDate.isAfter(dataToDate)) {
        return false;
    }
    return true;
}

function drawAxis(settings) {

    if (settings.drawOptions.includes('axis')) {
        let xAxis = settings.g.append('g')
            .attr('transform', 'translate(0,' + settings.innerHeight + ')')
            .call(d3.axisBottom(settings.x).ticks(Math.floor(settings.innerWidth / 100)));
        xAxis
            .selectAll('path')
            .style('stroke', settings.style.axis.color);
        xAxis
            .selectAll('line')
            .style('stroke', settings.style.axis.color);
        xAxis
            .selectAll('text')
            .style('fill', settings.style.axis.color)
            .attr('font-size', settings.style.fontSize + 'px')
            .attr('font-family', settings.style.fontFamily);



        let yAxis = settings.g.append('g')
            .attr('transform', 'translate(' + settings.innerWidth + ' ,0)')
            .call(d3.axisRight(settings.y).ticks(Math.floor(settings.innerHeight / 50)));
        yAxis
            .selectAll('path')
            .style('stroke', settings.style.axis.color);
        yAxis
            .selectAll('line')
            .style('stroke', settings.style.axis.color);
        yAxis
            .selectAll('text')
            .style('fill', settings.style.axis.color)
            .attr('font-size', settings.style.fontSize + 'px')
            .attr('font-family', settings.style.fontFamily);
    }
}


function drawMarkers(settings) {

    let mark = function (date, label) {
        let x1 = settings.x(getStartOfDay(date)) + 0.5;
        let y1 = settings.innerHeight;
        let y2 = 0;
        if (!getStartOfDay(date).isSame(settings.toDate) || !settings.drawOptions.includes('axis')) {
            //as we have an axis at the right side, we only draw
            //the marker if its not directly on top of the axis

            if (x1 > 0.5) {
                settings.g.append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x1)
                    .attr('y2', y2)
                    .style('stroke-width', '3')
                    .style('stroke', settings.style.markers.backgroundColor);
            }
            settings.g.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '1')
                .style('stroke', settings.style.markers.color);
        }

        drawTextWithBackground({
            text: (label ? label : moment(date).format(DATE_FORMAT)),
            x: x1,
            y: -15,
            color: settings.style.markers.color,
            textAnchor: 'middle',
            background: settings.style.backgroundColor,
            settings: settings
        });

    }

    if (settings.drawOptions.includes('markers') && settings.markers) {
        settings.markers.forEach(m => {
            if (isDateInRange(m.date, settings)) {
                mark(m.date, m.label);
            }
        });
    }
}


function getFirstEntryDate(settings) {
    return getStartOfDay(settings.data.entries[0].date);
}

function getLastEntryDate(settings) {
    return getStartOfDay(settings.data.entries[settings.data.entries.length - 1].date);
}


function dy(settings) {
    return settings.style.fontSize / 3 + 'px';
}

function drawTextWithBackground({
    text,
    textAnchor,
    x,
    y,
    color,
    background,
    settings
}) {
    let bkg = settings.g.append('rect')
        .style('fill', background);
    let txt = settings.g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('dy', dy(settings))
        .attr('font-size', settings.style.fontSize + 'px')
        .attr('font-family', settings.style.fontFamily)
        .style('fill', color)
        .style('text-anchor', textAnchor ? textAnchor : 'start')
        .text(text);

    try {
        let bbx = txt.node().getBBox();
        if (textAnchor == 'middle') {
            bkg.attr('x', x - bbx.width / 2);
        } else if (textAnchor == 'end') {
            bkg.attr('x', x - bbx.width);
        } else {
            bkg.attr('x', x);
        }
        bkg.attr('y', y - settings.style.fontSize / 2)
            .attr('width', bbx.width)
            .attr('height', settings.style.fontSize);
    } catch (e) {
        //JSDOM is not able to operate with bbox
        //therefore this code is not going to run in the tests
    }
}

function drawLegend(settings) {

    const lineHeight = settings.style.fontSize;

    const drawLegendItem = function ({
        text,
        x,
        y,
        fill
    }) {
        return settings.g.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('dy', dy(settings))
            .attr('font-size', settings.style.fontSize + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('text-anchor', 'start')
            .style('fill', fill)
            .text(text);
    }

    const drawRectangle = function ({
        x,
        y,
        width,
        height,
        fill,
        stroke
    }) {
        return settings.g.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height)
            .style('fill', fill ? fill : settings.style.backgroundColor)
            .style('stroke', stroke ? stroke : settings.style.backgroundColor);
    }

    if (settings.drawOptions.includes('title')) {
        //title
        if (settings.title) {
            drawLegendItem({
                text: settings.title,
                x: LEGEND_X - LEGEND_PAD,
                y: -35,
                fill: settings.style.color
            });
        }
    }

    if (settings.drawOptions.includes('legend')) {
        let hasTitle = settings.legendTitle;
        let background = drawRectangle({
            x: LEGEND_X - LEGEND_PAD,
            y: LEGEND_Y + lineHeight / 2 - LEGEND_PAD,
            width: settings.style.fontSize * 6,
            height: ((hasTitle ? 2 : 0.5) + settings.data.keys.length) * lineHeight,
            stroke: settings.style.color
        });

        //legend headline
        if (settings.legendTitle) {
            drawLegendItem({
                text: settings.legendTitle,
                x: LEGEND_X,
                y: LEGEND_Y + lineHeight,
                fill: settings.style.color
            });
        }

        settings.data.reverseKeys.forEach((key, index) => {
            drawRectangle({
                x: LEGEND_X,
                y: LEGEND_Y + ((hasTitle ? 2 : 0.5) + index) * lineHeight,
                width: lineHeight,
                height: lineHeight,
                fill: getColor(key, settings)
            });
            let item = drawLegendItem({
                text: key,
                x: LEGEND_X + lineHeight * 1.62,
                y: LEGEND_Y + ((hasTitle ? 2.5 : 1) + index) * lineHeight,
                fill: settings.style.color
            });

            //adjust background width
            //and use progress because it has the most length of 
            //To Do, In Progress and Done
            try {
                let bbox = item.node().getBBox();
                background.attr('width', bbox.width + 2.6 * lineHeight);
            } catch (e) {
                //JSDOM is not able to operate with bbox
                //therefore this code is not going to run in the tests
            }
        });
    }
}

/**
* <a href='https://travis-ci.com/ulfschneider/stacked-area'><img src='https://travis-ci.com/ulfschneider/stacked-area.svg?branch=master'/></a>
 * <a href='https://coveralls.io/github/ulfschneider/stacked-area?branch=master'><img src='https://coveralls.io/repos/github/ulfschneider/stacked-area/badge.svg?branch=master' /></a>
 * <a href='https://badge.fury.io/js/stacked-area'><img src='https://badge.fury.io/js/stacked-area.svg' /></a>
 *
 * Draw SVG Stacked Area Charts.
 * 
 * <img src="https://raw.githubusercontent.com/ulfschneider/stacked-area/master/stacked-area.png"/>
 *
 * Install in your Node project with 
 * <pre>
 * npm i stacked-area
 * </pre>
 * 
 * and use it inside your code via 
 * 
 * <pre>
 * const stackedArea = require('stacked-area');
 * </pre>
 * 
 * or, alternatively 
 * 
 * <pre>
 * import stackedArea from 'stacked-area';
 * </pre>
 * 
 * Create the new stackedArea objects via
 * 
 * <pre>
 * let diagram = stackedArea(settings);
 * </pre>
 * @constructor
 * @param {Object} settings - The configuration object for the diagram. 
 * All data for the diagram is provided with this object. 
 * In this configuration object, whenever a date is to be given, 
 * it can be an [ISO 8601 String](https://en.wikipedia.org/wiki/ISO_8601)
 * or a JavaScript [Date](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Date) object.
 * A [Moment](https://momentjs.com) object is also fine.
 * @param {String} [settings.title] - The title for the diagram.
 * @param {String} [settings.legendTitle] - The title for the legend.
 * @param {Object} settings.svg - The DOM tree element, wich must be an svg tag.
 * The diagram will be attached to this DOM tree element. Example:
 * <pre>settings.svg = document.getElementById('stackedAreaDiagram');</pre>
 * <code>'stackedAreaDiagram'</code> is the id of a svg tag.
 * @param {{top: Number, right: Number, bottom: Number, right: Number}} [settings.margin] - The margin for the diagram.
 * Default values are:
 * <pre>settings.margin = {
 * top: 50,
 * right: 50,
 * bottom: 50,
 * left: 50 }
 * </pre>
 * @param {String|Date} [settings.fromDate] - The start date for the diagram. Example:
 * <pre>settings.fromDate = '2018-09-01';</pre>
 * @param {String|Date} [settings.toDate] - The end date for the diagram. Example:
 * <pre>settings.toDate = '2018-09-05';</pre>
 * @param {{date:(String|Date), label:String}[]} [settings.markers] - Highlight specific dates inside of the diagram
 * with markers. Each marker is an object with a date for the marker and an optional label. Example:
 * <pre>settings.markers = [
 * { date: '2018-09-03', label: 'M1' },
 * { date: '2018-09-10', label: 'M2' }];</pre>
 * @param {String[]} [settings.drawOptions] - An array to determine the parts to be drawn. Possible options:
 * <pre>'title' - draw the title
 * 'axis' - draw the x and y axis
 * 'legend' - draw the legend information
 * 'markers' - draw the markers
 * 'focus' - draw detailed data when hovering the diagram
 * </pre> By default all of these draw options are on.
 * @param {Object} [settings.style] - Influence the appearance of the diagram with typeface and colors. The defaults are:
 * <pre>settings.style = {
 * fontSize: 12,
 * fontFamily: 'sans-serif',
 * color: '#222',
 * backgroundColor: '#fff',
 * axis: {color: '#222'},
 * markers: {color: '#222', backgroundColor: '#fff'}
 * }</pre>
 * You may configure colors for each stacked area, like for a chart with stacked areas named
 * 'Highest', 'High', 'Medium' and 'Low':
 * <pre>
 * settings.style.Highest = { color: 'chartreuse', stroke: 'white' };
 * settings.style.High = { color: 'cornflowerblue', stroke: 'white' };
 * settings.style.Medium = { color: 'darkorange', stroke: 'white' };
 * settings.style.Low = { color: 'firebrick', stroke: 'white' };
 * </pre>
 * @param {{keys: String[], entries: Object[]}} settings.data - The data for the diagram. Example:
 * <pre>settings.data = {
 * keys: ['Low', 'Medium', 'High', 'Highest'],
 * entries: [
 * { date: '2018-09-03', Highest: 0, High: 0, Medium: 0, Low: 0 },
 * { date: '2018-09-04', Highest: 1, High: 0, Medium: 0, Low: 0 },
 * { date: '2018-09-05', Highest: 1, High: 1, Medium: 0, Low: 0 },
 * { date: '2018-09-06', Highest: 1, High: 0, Medium: 1, Low: 1 },
 * { date: '2018-09-07', Highest: 2, High: 1, Medium: 0, Low: 2 },
 * { date: '2018-09-08', Highest: 1, High: 1, Medium: 2, Low: 2 },
 * { date: '2018-09-09', Highest: 0, High: 0, Medium: 1, Low: 5 },
 * { date: '2018-09-10', Highest: 1, High: 1, Medium: 0, Low: 5 }
 * ]}</pre>
 * Each entry object must contain a date and the counts for the keys.
 * Each key will be rendered as a stacked layer.
 * The rendering of the stacked layers will follow the order
 * of the keys. Hereby left to right keys leads to stacked areas from bottom to top.
 */
function StackedArea(settings) {
    this.settings = settings;
    this.defaultWidth = DEFAULT_WIDTH;
    this.defaultHeight = DEFAULT_HEIGHT;
}

StackedArea[Symbol.species] = StackedArea;

/**
 * Draw the Stacked Area Chart inside of the provided <code>settings.svg</code> DOM tree element.
 */
StackedArea.prototype.draw = function () {
    validateSettings(this.settings);
    this.remove();
    prepareSVG(this.settings);
    prepareScales(this.settings);
    prepareDataFunctions(this.settings);
    drawLayers(this.settings);
    drawAxis(this.settings);
    drawMarkers(this.settings);
    drawLegend(this.settings);
    drawFocus(this.settings);
}

/**
 * Clear the chart from the provided <code>settings.svg</code> DOM tree element
 */
StackedArea.prototype.remove = function () {
    if (this.settings.svg) {
        let svg = this.settings.svg;
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }
}

/**
 * Draw the Stacked Area Chart inside of the provided <code>settings.svg</code> DOM tree element 
 * and return the result as a string which can be assigned to the SRC attribute of an HTML IMG tag.
 * @returns {string}
 */
StackedArea.prototype.imageSource = function () {
    this.draw();
    let html = this.settings.svg.outerHTML;
    return 'data:image/svg+xml;base64,' + Base64.encode(html);
}

/**
 * Draw the Stacked Area Chart inside of the provided <code>settings.svg</code> DOM tree element 
 * and return the result as a SVG tag string.
 * @returns {string}
 */
StackedArea.prototype.svgSource = function () {
    this.draw();
    return this.settings.svg.outerHTML;
}

module.exports = function (settings) {
    return new StackedArea(settings);
}

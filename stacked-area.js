'use babel';

const d3 = require('d3');
const moment = require('moment');
const Base64 = require('js-base64').Base64;

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;
const DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_COLORS = ['#222', '#555', '#888', '#bbb'];

const CURVES = new Map([
    ['basis', d3.curveBasis],
    ['bundle', d3.curveBundle],
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
        settings.drawOptions = ['title', 'axis', 'legend', 'markers'];
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

function prepareScales(settings) {
    settings.x = d3.scaleTime()
        .range([0, settings.innerWidth]);
    settings.y = d3.scaleLinear()
        .range([settings.innerHeight, 0]);
}

function prepareDataFunctions(settings) {

    let curve = CURVES.get(settings.curve.type);
    if (settings.curve.type == 'bundle' && settings.curve.beta) {
        curve = curve.beta(settings.curve.beta);
    } else if (settings.curve.type == 'cardinal' && settings.curve.tension) {
        curve = curve.tension(settings.curve.tension);
    } else if (settings.curve.type == 'catmullRom' && settings.curve.alpa) {
        curve = curve.alpha(settings.curve.alpha);
    }
    //alpha, beta, tension
    settings.stack = d3.stack();
    settings.area = d3.area()
        .curve(curve)
        .x(function (d) {
            return settings.x(moment(d.data.date));
        })
        .y0(function (d) {
            return settings.y(d[0]);
        })
        .y1(function (d) {
            return settings.y(d[1]);
        });

    settings.fromDate = settings.fromDate ? moment(settings.fromDate)
        .startOf('day') : settings.fromDate;
    settings.toDate = settings.toDate ? moment(settings.toDate)
        .startOf('day') : settings.toDate;


    let xRange = d3.extent(settings.data.entries, function (d) {
        return moment(d.date);
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
        .on('mouseover', function() {console.log(new Date())})
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

function isDateInRange(date, settings) {
    let dataFromDate, dataToDate;
    let momentDate = moment(date);

    dataFromDate = moment(settings.data.entries[0].date);
    dataToDate = moment(settings.data.entries[settings.data.entries.length - 1].date);

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
        let x1 = settings.x(moment(date));
        if (x1 < 0.5) {
            //perfect left align if a marker sit at the most left boundary of the diagram
            x1 = 0.5;
        }
        let y1 = settings.innerHeight;
        let y2 = 0;
        if (!moment(date).isSame(settings.toDate) || !settings.drawOptions.includes('axis')) {
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

    const X = 10;
    const Y = 2.5;
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
                x: X - 3,
                y: -35,
                fill: settings.style.color
            });
        }
    }

    if (settings.drawOptions.includes('legend')) {
        let hasTitle = settings.legendTitle;
        let background = drawRectangle({
            x: X - 3,
            y: Y + lineHeight / 2 - 3,
            width: settings.style.fontSize * 6,
            height: ((hasTitle ? 2 : 0.5) + settings.data.keys.length) * lineHeight,
            stroke: settings.style.color
        });

        //legend headline
        if (settings.legendTitle) {
            drawLegendItem({
                text: settings.legendTitle,
                x: X,
                y: Y + lineHeight,
                fill: settings.style.color
            });
        }

        settings.data.reverseKeys.forEach((key, index) => {
            drawRectangle({
                x: X,
                y: Y + ((hasTitle ? 2 : 0.5) + index) * lineHeight,
                width: lineHeight,
                height: lineHeight,
                fill: getColor(key, settings)
            });
            let item = drawLegendItem({
                text: key,
                x: X + lineHeight * 1.62,
                y: Y + ((hasTitle ? 2.5 : 1) + index) * lineHeight,
                fill: settings.style.color
            });

            //adjust background width
            //and use progress because it has the most length of 
            //To Do, In Progress and Done
            try {
                let bbox = item.node().getBBox();
                background.attr('width', bbox.width + 2.2 * lineHeight);
            } catch (e) {
                //JSDOM is not able to operate with bbox
                //therefore this code is not going to run in the tests
            }
        });
    }
}




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
 * and return the result as a string which can be assigned to the src attribute of an HTML img tag.
 * @returns {string}
 */
StackedArea.prototype.imageSource = function () {
    this.draw();
    let html = this.settings.svg.outerHTML;
    return 'data:image/svg+xml;base64,' + Base64.encode(html);
}


StackedArea.prototype.svgSource = function () {
    this.draw();
    return this.settings.svg.outerHTML;
}

module.exports = function (settings) {
    return new StackedArea(settings);
}
